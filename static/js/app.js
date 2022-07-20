var loginComponent = Vue.component('login-component', {
    template: `<form v-on:submit.prevent="login">
        <p>Login to your account</p>

        <div class="form-outline mb-4">
            <input type="text" name="username" id="form2Example11" class="form-control"
                placeholder="Enter Username" v-model="username" />
        </div>
        <div class="form-outline mb-4">
            <input type="password" name="password" id="form2Example11" class="form-control"
                placeholder="Enter Password" v-model="password" />
        </div>

        <div class=" pt-1 mb-5 pb-1">
            <button class="btn btn-primary btn-block mb-3" style="background: #0d6efd;"
                type="submit">Log in</button>
        </div>

        <div class="d-flex align-items-center pb-4">
            <p class="mb-0 me-2">Don't have an account?</p>
            <a type="button" class="btn btn-outline-secondary"
                href="/create_user">Create new</a>
        </div>

    </form>`,
    data: function () {
        return {
            username: '',
            password: ''
        }
    },
    methods: {
        login: async function () {
            var response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.username,
                    password: this.password
                }),
            });
            var data = await response.json();
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                // set cookie
                document.cookie = 'username=' + this.username + '; expires=Sun, 1 Jan 2023 00:00:00 UTC; path=/'
                window.location.href = '/dashboard';
            }
        }
    }
});

var lastReviewComponent = Vue.component('last-review', {
    template: `<div class="card">
            <div class="card-body">
                <h3 class="card-title">Last Review</h3>
                <ul v-if="last_review" class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between align-items-start ps-0">
                        <div class="me-auto">
                            <div class="fw-bold">Deck Reviewed</div>
                            %{ last_reviewed_name }
                        </div>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-start ps-0">
                        <div class="me-auto">
                            <div class="fw-bold">Score on Last Review</div>
                        </div>
                        <span v-if="average_score*100 > 80" class="badge bg-success rounded-pill me-0">
                            %{(Math.round(average_score*100).toFixed(2))} %
                        </span>
                        <span v-else-if="average_score*100 > 60" class="badge bg-warning rounded-pill me-0">
                            %{(Math.round(average_score*100).toFixed(2))} %
                        </span>
                        <span v-else class="badge bg-danger rounded-pill me-0">
                            %{(Math.round(average_score*100).toFixed(2))} %
                        </span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-start ps-0">
                        <div class="me-auto">
                            <div class="fw-bold">Time of Last Review</div>
                            %{ last_review.time }
                        </div>
                    </li>
                    <div v-if="average_score*100 < 80" class="card mt-3 text-white bg-danger">
                        <div class="card-body">
                            Looks like you need more practice with <b>%{ last_reviewed_name }.</b>
                            <br>
                            <a :href="'/review/deck/' + last_review.deck_id + '?id=' + last_review.deck_id" class="text-white">Try Again.</a>
                        </div>
                    </div>
                    <div v-else class="card mt-3 text-white bg-success">
                        <div class="card-body">
                            You're doing great with ! <b>%{ last_reviewed_name }.</b>
                            <br>
                            <a :href="'/review/deck/' + last_review.deck_id + '?id=' + last_review.deck_id" class="text-white">Practice Again
                                ?</a>
                        </div>
                    </div>
                </ul>
                <p v-else >Previous Review Not Found</p>
            </div>
        </div>`,
    delimiters: ['%{', '}'],
    data: function () {
        return {
            username: null,
            decks: null,
            last_reviewed_name: null,
            last_review: null,
            average_score: null,
            total_score: null,
            total_reviews: null,
            min_deck: null
        }
    },
    mounted: async function () {
        var response = await fetch('/api/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.last_review = data.last_review;
        this.last_reviewed_name = data.last_reviewed_name;
        this.average_score = data.average_score;
        this.total_score = data.total_score;
        this.total_reviews = data.total_reviews;
        this.min_deck = data.min_deck;
        this.username = data.username;
        this.decks = data.decks;
    }
});

var dashboardHeaderComponent = Vue.component('dashboard-header', {
    template: `<div class="row mb-5 mt-5">
        <div class="col">
            <h1>Dashboard</h1>
            <p>Welcome <b> %{username} !</b></p>
        </div>
        <div class="col"><a type="button" class="btn btn-danger float-end" v-on:click="logout">Logout&nbsp;<i
                    class="bi bi-box-arrow-right"></i></a></div>
    </div>`,
    delimiters: ['%{', '}'],
    data: function () {
        return {
            username: ""
        }
    },
    mounted: async function () {
        var response = await fetch('/api/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.username = data.username;
    },
    methods: {
        logout: async function () {
            var response = await fetch('/logout', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                },
            });
            var data = await response.json();
            if (data.message) {
                localStorage.removeItem('access_token');
                document.cookie = 'username=' + this.username + '; expires=Sun, 1 Jan 2023 00:00:00 UTC; path=/'
                window.location.href = '/';
            }
        }
    }
});

var scoreListComponent = Vue.component('score-list', {
    template: `<div>
    <div v-if="decks.length!=0" class="alert alert-warning" role="alert">
            <b>Recommended Deck</b> : %{ min_deck.deck_name }<br><a
                :href="'/review/deck/' + last_review.deck_id" class="alert-link">Start Deck</a>
        </div>
        <div class="card">
            <div class="card-body">
                <h3 class="card-title">Scores
                    <span v-if="decks.length!=0" class="badge bg-dark rounded-pill float-end">
                        %{((total_score/(total_reviews*2))*100) } %
                    </span>
                    <span v-else class="badge bg-dark rounded-pill float-end">
                        0 %
                    </span>
                </h3>
                <p v-if="decks.length==0">No Scores Available. Add a Deck to Continue</p>
                <ul class="list-group list-group-flush">
                    <li v-for="deck in decks"
                        class="list-group-item d-flex justify-content-between align-items-start ps-0 pe-0">
                        <div class="me-auto">
                            <div class="fw-bold">%{ deck.deck_name }
                                <br>
                                <span
                                    v-if="deck.ind_reviews!=0 && deck.deck_score/(deck.ind_reviews*2)*100 < 60"
                                    class="text-danger">Needs Review</span>
                            </div>
                        </div>
                        <span v-if="deck.ind_reviews==0" class="badge bg-primary rounded-pill">0 %</span>
                        <span class="badge bg-success rounded-pill me-0">
                            %{ ((deck.deck_score/(deck.ind_reviews*2))*100) } %
                        </span>
                    </li>
                </ul>
            </div>
        </div>
        </div>`,
    delimiters: ['%{', '}'],
    data: function () {
        return {
            username: null,
            decks: [],
            last_reviewed_name: null,
            last_review: null,
            average_score: null,
            total_score: null,
            total_reviews: null,
            min_deck: null
        }
    },
    mounted: async function () {
        var response = await fetch('/api/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.last_review = data.last_review;
        this.last_reviewed_name = data.last_reviewed_name;
        this.average_score = data.average_score;
        this.total_score = data.total_score;
        this.total_reviews = data.total_reviews;
        this.min_deck = data.min_deck;
        this.username = data.username;
        this.decks = data.decks;
    }
})

var deckListComponent = Vue.component('deck-list', {
    template: `<div class="card">
                <div class="card-body">
                    <h3 class="card-title">All Decks</h3>
                    <ul class="list-group list-group-flush">
                        <p v-if="decks.length==0">No Decks Available. Add a Deck to Continue</p>
                        <li v-for="deck in decks" class="list-group-item mt-1 mb-2 ps-0">
                            <div class="row">
                                <div class="col">
                                    <h5>%{ deck.deck_name }</h5>
                                </div>
                                <div class="col">
                                    <div class="btn-group float-end" role="group" aria-label="Basic example">
                                        <a type="button" class="btn btn-success"
                                        :href="'/review/deck/' + deck.deck_id + '?id=' + deck.deck_id"><i
                                                class="bi bi-play-fill"></i></a>
                                        <a type="button" class="btn btn-warning"
                                            :href="'/edit/deck/' + deck.deck_id + '?id=' + deck.deck_id"><i
                                                class="bi bi-pencil-fill"></i></a>
                                        <a type="button" class="btn btn-danger"
                                        v-on:click="deleteDeck(deck.deck_id)"><i
                                                class="bi bi-trash-fill"></i></a>
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="card-footer">
                    <a href="/add/deck" class="btn btn-primary">Add Deck</a>
                    <a v-on:click="downloadCSV" class="btn btn-success">Export CSV</a>
                </div>
            </div>`,
    data: function () {
        return {
            decks: [],
        }
    },
    delimiters: ['%{', '}'],
    mounted: async function () {
        // fetch decks from server
        var response = await fetch('/api/decks', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.decks = data["decks"];
    },
    methods: {
        deleteDeck: async function (deck_id) {
            console.log(deck_id)
            var response = await fetch('/api/deck/' + deck_id, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                },
            });
            var data = await response.json();
            if (data["message"] == "Deck Deleted") {
                var response = await fetch('/api/decks', {
                    method: 'GET'
                });
                var data = await response.json();
                this.decks = data["decks"];
            }
        },
        downloadCSV: async function () {
            var response = await fetch('/api/decks', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                },
            });
            var data = await response.json();
            var decks = data["decks"];
            var formatted_decks = [];

            var headerName = {
                deck_id: "ID", // remove commas to avoid errors,
                deck_name: "Name",
                deck_score: "Score",
                ind_reviews: "No. of Reviews",
                last_reviewed: "Last Reviewed",
                username: "Username"
            };

            decks.forEach((item) => {
                formatted_decks.push({
                    deck_id: item.deck_id.toString().replace(/,/g, ''), // remove commas to avoid errors,
                    deck_name: item.deck_name,
                    deck_score: item.deck_score,
                    ind_reviews: item.ind_reviews,
                    last_reviewed: item.last_reviewed,
                    username: item.username
                });
            });
            this.exportCSVFile(headerName, formatted_decks, "decks");
        },
        convertToCSV: function (objArray) {
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
            var str = '';

            for (var i = 0; i < array.length; i++) {
                var line = '';
                for (var index in array[i]) {
                    if (line != '') line += ','

                    line += array[i][index];
                }

                str += line + '\r\n';
            }

            return str;
        },
        exportCSVFile: function (headers, items, fileTitle) {
            if (headers) {
                items.unshift(headers);
            }

            // Convert Object to JSON
            var jsonObject = JSON.stringify(items);

            var csv = this.convertToCSV(jsonObject);

            var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

            var blob = new Blob([csv], {
                type: 'text/csv;charset=utf-8;'
            });
            if (navigator.msSaveBlob) { // IE 10+
                navigator.msSaveBlob(blob, exportedFilenmae);
            } else {
                var link = document.createElement("a");
                if (link.download !== undefined) { // feature detection
                    // Browsers that support HTML5 download attribute
                    var url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", exportedFilenmae);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        }
    }
});

var addDeckComponent = Vue.component('add-deck', {
    template: `<div class="container py-5 h-100">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-xl-10">
                    <div class="card rounded-3 text-black">
                        <div class="row g-0">
                            <div class="col-lg-12 d-flex align-items-center" style="background: #0d6efd;">
                                <div class="text-white px-3 py-4 p-md-5 mx-md-4">
                                    <h4 class="mb-4">Add a new deck. Make sure you don't leave the deck name empty !
                                    </h4>
                                    <a href="/dashboard" class="btn btn-outline-light">Go Back</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-12">
                            <div class="card-body p-md-5 mx-md-4">
                                <form v-on:submit.prevent="addDeck">
                                    <div class="mb-3">
                                        <label for="exampleInputEmail1" class="form-label">Deck Name</label>
                                        <input type="text" class="form-control" v-model="deck_name" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Submit</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`,
    data: function () {
        return {
            deck_name: "",
        }
    },
    delimiters: ['%{', '}'],
    methods: {
        addDeck: async function () {
            var response = await fetch('/api/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                },
                body: JSON.stringify(this.deck_name)
            });
            var data = await response.json();
            if (data["message"] == "Deck Added") {
                window.location.href = "/dashboard";
            }
        }
    }
});

var editDeckComponent = Vue.component('edit-deck', {
    template: `<div class="container py-5 h-100">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-xl-10">
                    <div class="card rounded-3 text-black">
                        <div class="row g-0">
                            <div class="col-lg-12 d-flex align-items-center" style="background: #0d6efd;">
                                <div class="text-white px-3 py-4 p-md-5 mx-md-4">
                                    <h4 class="mb-4">Edit %{ deck.deck_name }
                                    </h4>
                                    <a href="/dashboard" class="btn btn-outline-light">Go Back</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-12">
                            <div class="card-body p-md-5 mx-md-4">
                                <form v-on:submit.prevent="deckNameSubmit">
                                    <div class="row">
                                        <input type="text" class="form-control" v-model="newDeckName" required>
                                        <button type="submit" class="btn btn-primary mt-3">Change Deck Name</button>
                                    </div>
                                </form>
                                <br><br>
                                <h2>All Cards in %{ deck.deck_name }&nbsp;&nbsp;
                                <span>
                                    <a type="button"
                                        class="btn btn-primary" :href="'/add/deck/' + deck.deck_id + '/add/card/?id=' + deck.deck_id">Add
                                        Card</a>
                                    <a type="button"
                                        class="btn btn-success" v-on:click="downloadCSV">Export CSV</a>
                                </span></h2>
                                <br><br>
                                <ul class="list-group list-group mb-5">
                                    <li v-for="card in cards" class="list-group-item">
                                        <div class="col float-start"><span
                                                class="align-items-centre"><b>%{ card.question }</b><br>%{ card.answer }</span>
                                        </div>
                                        <div class="col float-end">
                                            <div class="btn-group float-end" role="group" aria-label="Basic example">
                                                <a type="button" class="btn btn-warning"
                                                    :href="'/edit/deck/' + deck.deck_id + '/card/' + card.card_id + '?c_id=' + card.card_id + '&d_id=' + deck.deck_id">Edit</a>
                                                <a type="button" class="btn btn-danger" v-on:click="deleteCard(deck.deck_id,card.card_id)">Remove</a>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`,
    data: function () {
        return {
            deck: {},
            cards: [],
            newDeckName: ""
        }
    },
    delimiters: ['%{', '}'],
    mounted: async function () {
        var id = window.location.href.split("?id=")[1]
        console.log(window.location.pathname)
        var response = await fetch('/api/deck/' + id, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.deck = data["deck"];
        this.cards = data["cards"];
        this.newDeckName = this.deck.deck_name;
    },
    methods: {
        deckNameSubmit: async function () {
            console.log(this.form)
            this.deck.deck_name = this.newDeckName;
            var response = await fetch('/api/deck/' + this.deck.deck_id, {
                method: 'PUT',
                body: JSON.stringify(this.deck),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                }
            });
            var data = await response.json();
            if (data.message == "Deck Updated") {
                alert("Deck Updated")
            }
        },
        deleteCard: async function (deck_id, card_id) {
            if (confirm("Are you sure you want to delete this card?")) {
                var response = await fetch(`/api/card/${deck_id}/${card_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                    },
                });
                var data = await response.json();
                if (data.message == "Card Deleted") {
                    window.location.reload();
                }
            }
        },
        downloadCSV: async function () {
            var response = await fetch('/api/deck/' + this.deck.deck_id, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                },
            });
            var data = await response.json();
            var cards = data["cards"];
            var formatted_cards = [];

            var headerName = {
                card_id: "Card ID",
                deck_id: "Deck ID",
                question: "Question",
                answer: "Answer"
            };

            cards.forEach((item) => {
                formatted_cards.push({
                    card_id: item.card_id.toString(),
                    deck_id: item.deck_id.toString(),
                    question: item.question.toString().replace(/,/g, ""),
                    answer: item.answer.toString().replace(/,/g, "")
                });
            });
            this.exportCSVFile(headerName, formatted_cards, "cards");
        },
        convertToCSV: function (objArray) {
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
            var str = '';

            for (var i = 0; i < array.length; i++) {
                var line = '';
                for (var index in array[i]) {
                    if (line != '') line += ','

                    line += array[i][index];
                }

                str += line + '\r\n';
            }

            return str;
        },
        exportCSVFile: function (headers, items, fileTitle) {
            if (headers) {
                items.unshift(headers);
            }

            // Convert Object to JSON
            var jsonObject = JSON.stringify(items);

            var csv = this.convertToCSV(jsonObject);

            var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

            var blob = new Blob([csv], {
                type: 'text/csv;charset=utf-8;'
            });
            if (navigator.msSaveBlob) { // IE 10+
                navigator.msSaveBlob(blob, exportedFilenmae);
            } else {
                var link = document.createElement("a");
                if (link.download !== undefined) { // feature detection
                    // Browsers that support HTML5 download attribute
                    var url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", exportedFilenmae);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        }
    }
});

var addCardComponent = Vue.component('add-card', {
    template: `<div class="container py-5 h-100">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-xl-10">
                    <div class="card rounded-3 text-black">
                        <div class="row g-0">
                            <div class="col-lg-12 d-flex align-items-center" style="background: #0d6efd;">
                                <div class="text-white px-3 py-4 p-md-5 mx-md-4">
                                    <h4 class="mb-4">Add a card to %{ deck.deck_name }. Make sure you don't leave the
                                        fields empty !
                                    </h4>
                                    <a href="/dashboard" class="btn btn-outline-light">Go Back</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-12">
                            <div class="card-body p-md-5 mx-md-4">
                                <form v-on:submit.prevent="cardSubmit">
                                    <div class="mb-3">
                                        <label class="form-label">Question</label>
                                        <input type="text" class="form-control" v-model="card.card_question">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Answer</label>
                                        <input type="text" class="form-control" v-model="card.card_answer">
                                    </div>
                                    <button type="submit" class="btn btn-primary">Submit</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`,
    data: function () {
        return {
            deck: {},
            card: {}
        }
    },
    delimiters: ['%{', '}'],
    mounted: async function () {
        var id = window.location.href.split("?id=")[1]
        var response = await fetch('/api/deck/' + id, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.deck = data["deck"];
    },
    methods: {
        cardSubmit: async function () {
            var response = await fetch('/api/add/card/' + this.deck.deck_id, {
                method: 'POST',
                body: JSON.stringify(this.card),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                }
            });
            var data = await response.json();
            if (data.message == "Card Added") {
                if (confirm('Card Added ! Do you want to add another card ?')) {
                    this.card = {}
                } else {
                    window.location.href = '/dashboard'
                }
            }
        }
    }
});

var editCardComponent = Vue.component('edit-card', {
    template: `<div class="container py-5 h-100">
        <div class="row d-flex justify-content-center align-items-center h-100">
            <div class="col-xl-10">
                <div class="card rounded-3 text-black">
                    <div class="row g-0">
                        <div class="col-lg-12 d-flex align-items-center" style="background: #0d6efd;">
                            <div class="text-white px-3 py-4 p-md-5 mx-md-4">
                                <h4 class="mb-4">Edit Card %{ card.card_id }. Make sure you don't leave the
                                    fields empty !
                                </h4>
                                <a href="/dashboard" class="btn btn-outline-light">Go Back</a>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-12">
                        <div class="card-body p-md-5 mx-md-4">
                            <form v-on:submit.prevent="cardSubmit">
                                <div class="mb-3">
                                    <label class="form-label">Question</label>
                                    <input type="text" class="form-control" v-model="card.question">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Answer</label>
                                    <input type="text" class="form-control" v-model="card.answer">
                                </div>
                                <button type="submit" class="btn btn-primary">Submit</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`,
    data: function () {
        return {
            deck: {},
            card: {}
        }
    },
    delimiters: ['%{', '}'],
    mounted: async function () {
        let params = new URLSearchParams(window.location.search);
        var id = window.location.href.split("?id=")[1]
        var response = await fetch(`/api/card/${params.get('d_id')}/${params.get('c_id')}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.deck = data["deck"];
        this.card = data["card"]
    },
    methods: {
        cardSubmit: async function () {
            var response = await fetch(`/api/card/${this.deck.deck_id}/${this.card.card_id}`, {
                method: 'PUT',
                body: JSON.stringify(this.card),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                }
            });
            var data = await response.json();
            if (data.message == "Card Updated") {
                if (confirm('Card Updated ! Do you want return ?')) {
                    window.location.href = '/edit/deck/' + this.deck.deck_id + '?id=' + this.deck.deck_id
                }
            }
        }
    }
});

var reviewComponent = Vue.component('review-deck', {
    template: `<div class="container py-5 h-100">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-xl-10">
                    <div class="card rounded-3 text-black">
                        <div class="row g-0">
                            <div class="col-lg-12 d-flex align-items-center" style="background: #0d6efd;">
                                <div class="text-white px-3 py-4 pt-5 pb-5 mx-md-4">
                                    <h4>Review %{ deck.deck_name }</h4>
                                    <p>Note : Submitting before completion will result in a reduced score</p>
                                    <a href="/dashboard" class="btn btn-outline-light">Go Back</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-12">
                            <form v-on:submit.prevent="reviewSubmit">
                            <div class="card-body pt-5 pb-5 mx-md-4">
                                    <div id="carouselExampleControls" class="carousel carousel-dark slide" data-bs-interval="false"
                                        data-bs-wrap="false">
                                        <div class="carousel-inner">
                                            <div v-for="(card,i) in cards" v-if="i==0" class="carousel-item active">
                                                <div class="card">
                                                    <div class="card-body">
                    
                                                        <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
                                                            <li class="nav-item" role="presentation">
                                                                <button class="nav-link active" :id="'pills-question-tab-' + cards[i].card_id"
                                                                    data-bs-toggle="pill"
                                                                    :data-bs-target="'#pills-question-' + cards[i].card_id" type="button"
                                                                    role="tab" aria-controls="pills-question"
                                                                    aria-selected="true">Question</button>
                                                            </li>
                                                            <li class="nav-item" role="presentation">
                                                                <button class="nav-link" :id="'pills-answer-tab-' + cards[i].card_id"
                                                                    data-bs-toggle="pill"
                                                                    :data-bs-target="'#pills-answer-' + cards[i].card_id" type="button"
                                                                    role="tab" aria-controls="pills-answer"
                                                                    aria-selected="false">Answer</button>
                                                            </li>
                                                        </ul>
                                                        <div class="tab-content" id="pills-tabContent">
                                                            <div class="tab-pane fade show active" :id="'pills-question-' + cards[i].card_id"
                                                                role="tabpanel" aria-labelledby="pills-question-tab">
                                                                <h3 class="card-title">Question %{ i+1 } / %{ cards.length }</h3>
                                                                <h4>%{ cards[i].question }</h4>
                                                            </div>
                                                            <div class="tab-pane fade" :id="'pills-answer-' + cards[i].card_id"
                                                                role="tabpanel" aria-labelledby="pills-answer-tab">
                                                                <h3 class="card-title">%{ cards[i].question }</h3>
                                                                <h4>%{ cards[i].answer }</h4>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="card-footer">
                                                        <input type="radio" class="btn-check" :name="'card-' + cards[i].card_id"
                                                            :id="'easy-' + cards[i].card_id" autocomplete="off" value="easy" v-model="cards[i].selected">
                                                        <label class="btn btn-outline-success"
                                                            :for="'easy-' + cards[i].card_id">Easy</label>
                    
                                                        <input type="radio" class="btn-check" :name="'card-' + cards[i].card_id"
                                                            :id="'medium-' + cards[i].card_id" autocomplete="off" value="medium" v-model="cards[i].selected">
                                                        <label class="btn btn-outline-warning"
                                                            :for="'medium-' + cards[i].card_id">Medium</label>
                    
                                                        <input type="radio" class="btn-check" :name="'card-' + cards[i].card_id"
                                                            :id="'hard-' + cards[i].card_id" autocomplete="off" checked value="hard" v-model="cards[i].selected">
                                                        <label class="btn btn-outline-danger" :for="'hard-' + cards[i].card_id">Hard</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-else class="carousel-item">
                                                <div class="card">
                                                    <div class="card-body">
                                                        <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
                                                            <li class="nav-item" role="presentation">
                                                                <button class="nav-link active" :id="'pills-question-tab-' + cards[i].card_id"
                                                                    data-bs-toggle="pill"
                                                                    :data-bs-target="'#pills-question-' + cards[i].card_id" type="button"
                                                                    role="tab" aria-controls="pills-question"
                                                                    aria-selected="true">Question</button>
                                                            </li>
                                                            <li class="nav-item" role="presentation">
                                                                <button class="nav-link" :id="'pills-answer-tab-' + cards[i].card_id"
                                                                    data-bs-toggle="pill"
                                                                    :data-bs-target="'#pills-answer-' + cards[i].card_id" type="button"
                                                                    role="tab" aria-controls="pills-answer"
                                                                    aria-selected="false">Answer</button>
                                                            </li>
                                                        </ul>
                                                        <div class="tab-content" id="pills-tabContent">
                                                            <div class="tab-pane fade show active" :id="'pills-question-' + cards[i].card_id"
                                                                role="tabpanel" aria-labelledby="pills-question-tab">
                                                                <h3 class="card-title">Question %{ i+1 } / %{ cards.length }</h3>
                                                                <h4>%{ cards[i].question }</h4>
                                                            </div>
                                                            <div class="tab-pane fade" :id="'pills-answer-' + cards[i].card_id"
                                                                role="tabpanel" aria-labelledby="pills-answer-tab">
                                                                <h3 class="card-title">%{ cards[i].question }</h3>
                                                                <h4>%{ cards[i].answer }</h4>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="card-footer">
                                                        <input type="radio" class="btn-check"
                                                            :id="'easy-' + cards[i].card_id" autocomplete="off" value="easy" v-model="cards[i].selected">
                                                        <label class="btn btn-outline-success"
                                                            :for="'easy-' + cards[i].card_id">Easy</label>
                    
                                                        <input type="radio" class="btn-check"
                                                            :id="'medium-' + cards[i].card_id" autocomplete="off" value="medium" v-model="cards[i].selected">
                                                        <label class="btn btn-outline-warning"
                                                            :for="'medium-' + cards[i].card_id">Medium</label>
                    
                                                        <input type="radio" class="btn-check"
                                                            :id="'hard-' + cards[i].card_id" autocomplete="off" checked value="hard" v-model="cards[i].selected">
                                                        <label class="btn btn-outline-danger" :for="'hard-' + cards[i].card_id">Hard</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleControls"
                                            data-bs-slide="next">
                                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                            <span class="visually-hidden">Next</span>
                                        </button>
                                    </div>
                    
                            </div>
                            <div class="card-footer p-0 m-0">
                                <div class="row">
                                    <div class="col">
                                        <button type="submit" class="btn btn-primary w-100">Submit</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
                <div class="row justify-content-center">
                    <img src="/static/logo.svg" style="width: 185px;filter: grayscale() brightness(1.8);" alt="logo">
                </div>
            </div>
        </div>`,
    delimiters: ['%{', '}'],
    data: function () {
        return {
            deck: {},
            cards: []
        }
    },
    mounted: async function () {
        let params = new URLSearchParams(window.location.search);
        var response = await fetch(`/api/review/${params.get('id')}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            },
        });
        var data = await response.json();
        this.deck = data["deck"];
        this.cards = data["cards"]
    },
    methods: {
        reviewSubmit: async function () {
            let params = new URLSearchParams(window.location.search);
            var response = await fetch(`/api/review/${params.get('id')}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                },
                body: JSON.stringify(this.cards)
            });
            var data = await response.json();
            if (data["message"] == "Review Submitted") {
                alert("Review Submitted");
                window.location.href = "/dashboard";
            }
        }

    }
});

var app = new Vue({
    el: '#app',
});