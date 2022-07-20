from copyreg import constructor
from datetime import datetime
from enum import unique
from http.client import NOT_FOUND
from importlib.resources import Resource
import json
from logging import error
import random
from application import workers, tasks
from urllib import request, response
from flask import Flask, render_template, request, jsonify
from flask.helpers import flash, make_response
from flask_restful import Resource, Api
from flask_restful import fields, marshal_with
from flask_restful import reqparse
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import redirect
import os
from flask_security import login_required
from flask_caching import Cache
from flask_jwt_extended import create_access_token, unset_access_cookies
from flask_jwt_extended import get_jwt_identity, get_jwt
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash, check_password_hash

from werkzeug.wrappers import response

app = Flask(__name__)
dir_path = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + \
    os.path.join(dir_path, "database.db")

current_user = None

db = SQLAlchemy()
db.init_app(app)
app.app_context().push()
api = Api(app)

celery = workers.celery
celery.conf.update(
    broker_url="redis://localhost:6379/1",
    result_backend="redis://localhost:6379/2"
)
celery.Task = workers.ContextTask
app.app_context().push()

app.config["JWT_SECRET_KEY"] = "mykey723712738"  # Change this!
jwt = JWTManager(app)

app.config["CACHE_TYPE"] = "redis"
app.config['CACHE_REDIS_HOST'] = "redis"
app.config['CACHE_REDIS_PORT'] = 6379
app.config['CACHE_REDIS_DB'] = 0
app.config["CACHE_REDIS_URL"] = "redis://localhost:6379/0"
app.config['CACHE_DEFAULT_TIMEOUT'] = 500

app.config['CELERY_BROKER_URL'] = "redis://localhost:6379/1"
app.config['CELERY_RESULT_BACKEND'] = "redis://localhost:6379/2"

cache = Cache(app)

class Login(db.Model):
    __tablename__ = "user"
    username = db.Column(db.String, autoincrement=True,
                         primary_key=True, unique=True)
    password = db.Column(db.String, nullable=False)


class Deck(db.Model):
    __tablename__ = "deck"
    deck_id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    deck_name = db.Column(db.String, nullable=False)
    username = db.Column(db.Integer, db.ForeignKey(
        "user.username"), nullable=False)
    deck_score = db.Column(db.Integer, nullable=False)
    last_reviewed = db.Column(db.String, nullable=False)
    ind_reviews = db.Column(db.Integer, nullable=False)


class Card(db.Model):
    __tablename__ = "card"
    card_id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    deck_id = db.Column(db.Integer, db.ForeignKey(
        "deck.deck_id"), nullable=False)
    question = db.Column(db.String, nullable=False)
    answer = db.Column(db.Integer, nullable=False)


class Review(db.Model):
    __tablename__ = "review"
    review_id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    card_id = db.Column(db.Integer, db.ForeignKey(
        "card.card_id"))
    deck_id = db.Column(db.Integer, db.ForeignKey(
        "deck.deck_id"), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    time = db.Column(db.String, nullable=False)


@app.route('/', methods=["GET"])
def login_show():
    return render_template("login.html")


@app.route('/create_user')
def create_account():
    return render_template('create_user.html')


@app.route('/create_user', methods=["POST"])
def create_account_process():

    # Get the username and password from the form
    username = request.form.get("username")
    password = request.form.get("password")

    data = request.form
    username = data["username"]
    user = Login(username=username, password=generate_password_hash(
        password, method='sha256'))
    db.session.add(user)
    db.session.commit()
    return redirect("/")


@app.route('/login', methods=["POST"])
def login_process():

    data = json.loads(request.data)
    username = data.get("username", None)
    password = data.get("password", None)

    user = Login.query.filter_by(username=username).first()
    if user is not None and check_password_hash(user.password, password):
        global current_user
        current_user = username
        access_token = create_access_token(identity=username)
        res = app.make_response(redirect("/dashboard"))
        res.set_cookie("username", value=current_user)
        return jsonify(access_token=access_token)

    else:
        return render_template("login.html", error="User Not Found")


@app.route('/logout', methods=["GET"])
def logout():
    res = app.make_response(redirect("/"))
    unset_access_cookies(res)
    global current_user
    current_user = None
    # delete username cookie
    res.set_cookie("username", value="", expires=0)
    return {"message": "Logged out"}, 200


@app.route('/dashboard')
def show_info():
    return render_template("dashboard.html")


#
#
# Deck API
#
#

'''
# @app.route('/delete/deck/<int:deck_id>', methods=["GET", "POST"])
# def remove_deck(deck_id):
#     deck = Deck.query.filter_by(deck_id=deck_id).first()
#     db.session.delete(deck)
#     db.session.commit()
#     return redirect("/dashboard")
'''


@app.route('/add/deck', methods=["GET"])
def add_deck_show():
    return render_template("add_deck.html")


@app.route('/add/deck', methods=["POST"])
def add_deck_process():
    data = request.form
    if(data["deck_name"].isspace()):
        return (render_template('add_deck.html', error="Deck Name cannot be Empty"))
    deck = Deck(deck_name=data["deck_name"], username=request.cookies.get(
        'username'), ind_reviews=0, deck_score=0)
    db.session.add(deck)
    db.session.commit()
    return redirect("/dashboard")


@app.route('/edit/deck/<int:deck_id>', methods=["GET"])
def edit_deck_show(deck_id):
    '''
    # deck = Deck.query.filter_by(deck_id=deck_id).first()
    # cards = Card.query.filter_by(deck_id=deck_id)
    # return render_template("edit_deck.html", deck=deck, cards=cards)
    '''
    return render_template("edit_deck.html")


'''
# @app.route('/edit/deck/<int:deck_id>', methods=["POST"])
# def edit_deck_process(deck_id):
#     data = request.form
#     name = data["deck_name"]
#     deck = Deck.query.filter_by(deck_id=deck_id).first()
#     cards = Card.query.filter_by(deck_id=deck_id)
#     if(name.isspace()):
#         return (render_template('edit_deck.html', deck=deck, cards=cards, error="Deck Name cannot be Empty"))
#     deck = Deck.query.filter_by(deck_id=deck_id).first()
#     deck.deck_name = name
#     db.session.commit()
#     return redirect("/edit/deck/{}".format(deck_id))
'''

#
#
# Card API
#
#


@app.route('/add/deck/<int:deck_id>/add/card/', methods=["GET"])
def add_card_show(deck_id):
    '''
    # deck = Deck.query.filter_by(deck_id=deck_id).first()
    # return render_template("add_card.html", deck=deck)
    '''
    return render_template("add_card.html")


'''
# @app.route('/add/deck/<int:deck_id>/add/card/', methods=["POST"])
# def add_card_process(deck_id):
#     data = request.form
#     card = Card(deck_id=deck_id,
#                 question=data["card_question"], answer=data["card_answer"])
#     db.session.add(card)
#     db.session.commit()
#     return redirect('/edit/deck/{}'.format(deck_id))


# @app.route('/delete/deck/<int:deck_id>/card/<int:card_id>')
# def delete_card_process(deck_id, card_id):
#     card = Card.query.filter_by(card_id=card_id).first()
#     db.session.delete(card)
#     db.session.commit()
#     return redirect('/edit/deck/{}'.format(deck_id))
'''


@app.route('/edit/deck/<int:deck_id>/card/<int:card_id>', methods=["GET"])
def edit_card_show(deck_id, card_id):
    '''
    # card = Card.query.filter_by(card_id=card_id).first()
    # deck = Deck.query.filter_by(deck_id=deck_id).first()
    # return render_template("edit_card.html", card=card, deck=deck)
    '''
    return render_template("edit_card.html")


'''
# @app.route('/edit/deck/<int:deck_id>/card/<int:card_id>', methods=["POST"])
# def edit_card_process(deck_id, card_id):
#     data = request.form
#     card = Card.query.filter_by(card_id=card_id).first()
#     card.question = data["card_question"]
#     card.answer = data["card_answer"]
#     db.session.commit()
#     return redirect('/edit/deck/{}'.format(deck_id))
'''

# Review API


@app.route('/review/deck/<int:deck_id>', methods=["GET"])
def review_show(deck_id):
    '''
    # deck = Deck.query.filter_by(deck_id=deck_id).first()
    # cards = Card.query.filter_by(deck_id=deck_id).all()
    # random.shuffle(cards)
    # return render_template("review_deck.html", cards=cards, deck=deck)
    '''
    return render_template("review_deck.html")


'''
# @app.route('/review/deck/<int:deck_id>', methods=["POST"])
# def review_process(deck_id):
#     data = request.form
#     time = datetime.now()
#     score = 0
#     for card in data:
#         int_score = 0
#         if (data[card] == "hard"):
#             score += 0
#             int_score = 0
#         elif (data[card] == "medium"):
#             score += 1
#             int_score = 1
#         elif (data[card] == "easy"):
#             score += 2
#             int_score = 2
#         card_id = int(card.split("-")[1])
#         review = Review(deck_id=deck_id, card_id=card_id,
#                         score=int_score, time=time)
#         db.session.add(review)
#         db.session.commit()
#     deck = Deck.query.filter_by(deck_id=deck_id).first()
#     num_reviews = len(Review.query.filter_by(deck_id=deck_id).all())
#     print(score)
#     deck.deck_score += score
#     deck.last_reviewed = time
#     deck.ind_reviews = num_reviews
#     db.session.commit()
#     return redirect('/dashboard')
'''


class StatsAPI(Resource):
    @cache.cached(timeout=30, query_string=True)
    @jwt_required()
    def get(self):
        username = request.cookies.get('username')
        decks = Deck.query.filter_by(username=username).all()
        last_reviewed_name = None
        total_score = 0
        total_reviews = 0
        min_deck = None
        min_avg = 100

        for deck in decks:
            if deck.ind_reviews != 0:
                avg = deck.deck_score/deck.ind_reviews
                if (avg <= min_avg):
                    min_avg = avg
                    min_deck = deck
            total_score += deck.deck_score
            total_reviews += deck.ind_reviews

        last_review = Review.query.join(Deck).filter_by(
            username=username).order_by(Review.review_id.desc()).first()

        last_reviewed_deck = None
        if last_review is not None:
            last_reviewed_deck = Deck.query.filter_by(
                deck_id=last_review.deck_id, username=username).first()

        if last_reviewed_deck is not None:
            last_reviewed_name = last_reviewed_deck.deck_name
            recent_reviews = Review.query.filter_by(
                time=last_review.time).all()
            score = 0
            for review in recent_reviews:
                score += review.score
            average_score = score/(len(recent_reviews)*2)
            return {
                "username": username,
                "decks": [{
                    "deck_id": deck.deck_id,
                    "deck_name": deck.deck_name,
                    "username": deck.username,
                    "ind_reviews": deck.ind_reviews,
                    "deck_score": deck.deck_score,
                    "last_reviewed": deck.last_reviewed
                }for deck in decks],
                "last_reviewed_name": last_reviewed_name,
                "last_review": {
                    "deck_id": last_review.deck_id,
                    "deck_name": last_reviewed_name,
                    "username": username,
                    "ind_reviews": last_reviewed_deck.ind_reviews,
                    "deck_score": last_reviewed_deck.deck_score,
                    "review_id": last_review.review_id,
                    "last_reviewed": last_reviewed_deck.last_reviewed,
                    "time": last_review.time,
                    "score": last_review.score,
                    "average_score": average_score
                },
                "average_score": average_score,
                "total_score": total_score,
                "total_reviews": total_reviews,
                "min_deck": {
                    "deck_id": min_deck.deck_id,
                    "deck_name": min_deck.deck_name,
                    "username": min_deck.username,
                    "ind_reviews": min_deck.ind_reviews,
                    "deck_score": min_deck.deck_score,
                    "last_reviewed": min_deck.last_reviewed
                }
            }, 200
        else:
            return {
                "username": username,
                "decks": [{
                    "deck_id": deck.deck_id,
                    "deck_name": deck.deck_name,
                    "username": deck.username,
                    "ind_reviews": deck.ind_reviews,
                    "deck_score": deck.deck_score,
                    "last_reviewed": deck.last_reviewed
                }for deck in decks],
            }, 200


api.add_resource(StatsAPI, '/api/stats')


class DecksAPI(Resource):
    # @cache.cached(timeout=300, query_string=True)
    def get(self):
        username = request.cookies.get('username')
        decks = Deck.query.filter_by(username=username).all()
        return {"decks": [{
            "deck_id": deck.deck_id,
            "deck_name": deck.deck_name,
            "username": deck.username,
            "ind_reviews": deck.ind_reviews,
            "deck_score": deck.deck_score,
            "last_reviewed": deck.last_reviewed
        }for deck in decks]}, 200


api.add_resource(DecksAPI, '/api/decks')


class DeckAPI(Resource):
    @jwt_required()
    def post(self):
        data = json.loads(request.data)
        if(data.isspace()):
            return {"error": "Deck Name cannot be Empty"}, 400
        deck = Deck(deck_name=data, username=request.cookies.get(
            'username'), ind_reviews=0, deck_score=0)
        db.session.add(deck)
        db.session.commit()
        return {"message": "Deck Added"}, 200

    @jwt_required()
    def get(self, deck_id):
        deck = Deck.query.filter_by(deck_id=deck_id).first()
        cards = Card.query.filter_by(deck_id=deck_id)
        # if deck is empty return 404
        if(deck is None):
            return "404", 404
        return {
            "deck": {
                'deck_id': deck.deck_id,
                'deck_name': deck.deck_name,
                'ind_reviews': deck.ind_reviews,
                'deck_score': deck.deck_score,
                'last_reviewed': deck.last_reviewed
            },
            "cards": [{
                'deck_id': card.deck_id,
                'card_id': card.card_id,
                'question': card.question,
                'answer': card.answer
            } for card in cards]
        }, 200

    @jwt_required()
    def put(self, deck_id):
        print(request.data)
        data = json.loads(request.data)
        name = data["deck_name"]
        deck = Deck.query.filter_by(deck_id=deck_id).first()
        if(name.isspace()):
            return {"error": "Deck Name cannot be Empty"}, 400
        deck = Deck.query.filter_by(deck_id=deck_id).first()
        deck.deck_name = name
        db.session.commit()
        return {
            "message": "Deck Updated",
        }, 200

    @jwt_required()
    def delete(self, deck_id):
        print(deck_id)
        deck = Deck.query.filter_by(deck_id=deck_id).first()
        db.session.delete(deck)
        db.session.commit()
        return {"message": "Deck Deleted"}, 200


api.add_resource(DeckAPI, "/api/add", "/api/deck/<int:deck_id>")


class CardAPI(Resource):

    @jwt_required()
    def post(self, deck_id):
        print(deck_id)
        data = json.loads(request.data)
        card = Card(deck_id=deck_id,
                    question=data["card_question"], answer=data["card_answer"])
        db.session.add(card)
        db.session.commit()
        return {"message": "Card Added"}, 200

    @jwt_required()
    def get(self, deck_id, card_id):
        card = Card.query.filter_by(card_id=card_id).first()
        deck = Deck.query.filter_by(deck_id=deck_id).first()
        if(card is None):
            return "404", 404
        return {
            "card": {
                'deck_id': card.deck_id,
                'card_id': card.card_id,
                'question': card.question,
                "answer": card.answer
            },
            "deck": {
                'deck_id': deck.deck_id,
                'deck_name': deck.deck_name,
                'ind_reviews': deck.ind_reviews,
                'deck_score': deck.deck_score,
                'last_reviewed': deck.last_reviewed
            }
        }, 200

    @jwt_required()
    def put(self, deck_id, card_id):
        data = json.loads(request.data)
        card = Card.query.filter_by(card_id=card_id).first()
        card.question = data["question"]
        card.answer = data["answer"]
        db.session.commit()
        return {"message": "Card Updated"}, 200

    @jwt_required()
    def delete(self, deck_id, card_id):
        print(card_id)
        card = Card.query.filter_by(card_id=card_id).first()
        db.session.delete(card)
        db.session.commit()
        return {"message": "Card Deleted"}, 200


api.add_resource(CardAPI, "/api/add/card/<int:deck_id>",
                 "/api/card/<int:deck_id>/<int:card_id>")


class ReviewAPI(Resource):
    @jwt_required()
    def get(self, deck_id):
        deck = Deck.query.filter_by(deck_id=deck_id).first()
        cards = Card.query.filter_by(deck_id=deck_id).all()
        random.shuffle(cards)
        return {
            "deck": {
                'deck_id': deck.deck_id,
                'deck_name': deck.deck_name,
                'ind_reviews': deck.ind_reviews,
                'deck_score': deck.deck_score,
                'last_reviewed': deck.last_reviewed
            },
            "cards": [{
                'deck_id': card.deck_id,
                'card_id': card.card_id,
                'question': card.question,
                'answer': card.answer,
                'selected': 'hard'
            } for card in cards]
        }, 200

    @jwt_required()
    def post(self, deck_id):
        data = json.loads(request.data)
        print(data)
        time = datetime.now()
        score = 0
        for card in data:
            int_score = 0
            if (card["selected"] == "hard"):
                score += 0
                int_score = 0
            elif (card["selected"] == "medium"):
                score += 1
                int_score = 1
            elif (card["selected"] == "easy"):
                score += 2
                int_score = 2
            card_id = card["card_id"]
            review = Review(deck_id=deck_id, card_id=card_id,
                            score=int_score, time=time)
            db.session.add(review)
            db.session.commit()
        deck = Deck.query.filter_by(deck_id=deck_id).first()
        num_reviews = len(Review.query.filter_by(deck_id=deck_id).all())
        print(score)
        deck.deck_score += score
        deck.last_reviewed = time
        deck.ind_reviews = num_reviews
        db.session.commit()
        return {"message": "Review Submitted"}, 200


api.add_resource(ReviewAPI, "/api/review/<int:deck_id>")

if __name__ == '__main__':
    app.run(debug=True,threaded=True)
