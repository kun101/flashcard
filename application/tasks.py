import json
from application.workers import celery
from datetime import datetime
from flask import current_app as app
import requests
import smtplib
from email.message import EmailMessage

from celery.schedules import crontab
print("crontab ", crontab)


@celery.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(10.0, remind_to_play.s(), name='sending email')
    sender.add_periodic_task(
        crontab(hour=18, minute=30, day_of_week=1),
        remind_to_play.s(),
    )

@celery.task
def remind_to_play():
    r = requests.get("http://127.0.0.1:5000/api/decks")
    decks = json.loads(r.text)
    # check last reviewed time for each deck
    for deck in decks:
        last_review = deck["last_review"]
        if last_review is None:
            continue
        last_review = datetime.strptime(last_review, "%Y-%m-%dT%H:%M:%S.%fZ")
        now = datetime.utcnow()
        if(now-last_review).days > 30:
            print("Remind to play ", deck["name"])
            requests.post('https://chat.googleapis.com/v1/spaces/AAAA39veNxs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=1BEQxCzhzsU0S6DUQxNUF2Hlcg4TYOFL_TIYyRX1RSk%3D',json={'text':'You have not practised today !'})

@celery.task
def monthly_report():
    deckArr = []
    r = requests.get("http://127.0.0.1:5000/api/decks")
    decks = json.loads(r.text)
    # get all last reviewed time for this month
    for deck in decks:
        last_review = deck["last_review"]
        if last_review is None:
            continue
        last_review = datetime.strptime(last_review, "%Y-%m-%dT%H:%M:%S.%fZ")
        now = datetime.utcnow()
        if(now-last_review).days > 30:
            print("Remind to play ", deck["name"])
            deckArr.append(deck["name"])
    # send email to admin
    msg = EmailMessage()
    msg['Subject'] = 'Monthly Report'
    msg['From'] = "21f1003353@student.onlinedegree.iitm.ac.in"
    msg['To'] = "21f1003353@student.onlinedegree.iitm.ac.in"
    msg.set_content('\n'.join(deckArr) + '\n' + "<b>YOUR MONTHLY DECK REPORT</b>") 

    # Send the message via our own SMTP server.
    s = smtplib.SMTP('localhost')
    s.send_message(msg)

