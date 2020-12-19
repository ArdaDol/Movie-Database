const { ObjectID } = require('mongodb');
const express = require('express');
const model = require('./model');
const pug = require('pug');
const app = express();
const mc = require('mongodb').MongoClient;

function sessionValidator(req, res, next) {
    if (!req.session || !req.session.user) res.redirect('/login');
    else next();
}

function properCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

mc.connect("mongodb://localhost:27017/").then(client => {
    const database = client.db("movies-database");

    app.use(require('express-session')({ secret: "SECRET" }));
    app.use(express.urlencoded( {extended: true} ));
    app.use(express.static('public'));

    app.route('/')
        .get(sessionValidator, (req, res) => res.redirect('/home'));

    app.route('/movies/:id?')
        .get(async (req, res) => {
            if (req.params.id) res.send(await model.getMovies(database, {_id: (req.params.id.length == 24) ? ObjectID(req.params.id) : ""}));
            else {
                let filter = {};
                const p = Object.entries(req.query).map(q => {
                    switch (q[0].toLowerCase()) {
                        case "title":
                        case "genre":
                        case "country":
                        case "director":
                        case "actors":
                        case "country":
                            filter[properCase(q[0])] = new RegExp(q[1], 'i');
                            break;

                        case "year":
                            filter[properCase(q[0])] = q[1];
                            break;

                        default:
                            break;
                    }
                });

                Promise.all(p).then(async () => {
                    res.send(await model.getMovies(database, filter));
                })
            }
        })
        .post(sessionValidator, async (req, res) => {
            if (req.params.id) res.status(404).send("Cannot post to this URL");
            else {
                if (
                    !req.body.Title ||
                    !req.body.Released ||
                    !req.body.Runtime ||
                    !req.body.Genres ||
                    !req.body.Directors ||
                    !req.body.Writers ||
                    !req.body.Poster ||
                    !req.body.Plot
                ) res.send("Please provide all Title, Released, Runtime, Genres, Directors, Writers, Poster, Plot");
                else {
                    model.makeMovie(database, req.body);
                    res.send("MOVIE MADE");
                }
            }
        })

    app.route('/users/:id?')
        .get(async (req, res) => {
            if (req.params.id) res.send(await model.getUsers(database, {_id: (req.params.id.length == 24) ? ObjectID(req.params.id) : ""}));
            else {
                let filter = {};
                const p = Object.entries(req.query).map(q => {
                    switch (q[0].toLowerCase()) {
                        case "username":
                        case "name":
                            filter[q[0]] = new RegExp(q[1], 'i');
                            break;

                        default:
                            break;
                    }
                });

                Promise.all(p).then(async () => {
                    res.send(await model.getUsers(database, filter));
                })
            }
        })
        .post(async (req, res) => {
            if (req.params.id) res.status(404).send("Cannot post to this URL");
            else {
                if (!req.body.username || !req.body.password) res.redirect('/login');
                else {
                    let makeStatus = await model.makeUser(database, req.body);
                    if (makeStatus) {
                        await model.getUsers(database, {username: req.body.username}).then(arr => {
                            req.session.user = arr[0];
                            res.redirect('/home');
                        })
                    }
                    else res.send(pug.renderFile(`${__dirname}/templates/login.pug`, {msg: "Username Exists"}))
                }
            }
        })

    app.route('/login')
        .get((req, res) => res.send(pug.renderFile(`${__dirname}/templates/login.pug`, {msg: ""})))
        .post(async (req, res) => {
            if (!req.body.username || !req.body.password) res.redirect('/login');
            else {
                let loginStatus = await model.login(database, req.body.username, req.body.password);
                if (loginStatus) {
                    await model.getUsers(database, {username: req.body.username}).then(arr => {
                        req.session.user = arr[0];
                        res.redirect('/home');
                    });
                }
                else res.send(pug.renderFile(`${__dirname}/templates/login.pug`, {msg: "Invalid Usename or Password"}));
            }
        })
    
    app.get('/home', sessionValidator, (req, res) => res.send(pug.renderFile(`${__dirname}/templates/home.pug`, {
        msg: "",
        user: req.session.user
    })));

    app.get('/browse/:page?/:sub?', sessionValidator, async (req, res) => {
        if (!req.params.page) res.redirect('/home');
        else {
            switch (req.params.page) {
                case "movies":
                    if (req.params.sub) {   
                        let resMovie = await model.getMovies(database, {_id: (req.params.sub.length == 24)?ObjectID(req.params.sub):""});
                        if (resMovie.length == 0) res.redirect('/browse/movies');
                        else {
                            try {
                                res.send(pug.renderFile(`${__dirname}/templates/browse.movies.movie.pug`, {
                                    msg: "",
                                    user: req.session.user,
                                    movie: resMovie[0]
                                }));
                            } catch (e) {
                                res.send(pug.renderFile(`${__dirname}/templates/browse.movies.movie.pug`, {
                                    msg: "Invalid filter",
                                    user: req.session.user,
                                    movie: resMovie[0]
                                }))
                            }
                        }
                    }
                    else {
                        let filter = {};
                        let p = Object.entries(req.query).map(q => {
                            switch (q[0].toLowerCase()) {
                                case "title":
                                case "genre":
                                case "country":
                                case "director":
                                case "actors":
                                case "country":
                                    filter[properCase(q[0])] = new RegExp(q[1], 'i');
                                    break;

                                case "year":
                                    filter[properCase(q[0])] = q[1];
                                    break;

                                default:
                                    break;
                            }
                        });

                        Promise.all(p).then(async () => {
                            let resMovies = [];
                            let allMovies = await model.getMovies(database, filter);
    
                            let n = 0;
                            let tempArr = [];
                            let p2 = allMovies.map(m => {
                                tempArr.push(m);
                                n++;
                                if (n % 15 == 0 || n == allMovies.length) {
                                    resMovies.push(tempArr);
                                    tempArr = [];
                                }
                            });
    
                            Promise.all(p2).then(() => {
                                let queryString = "?";
                                for (var i in req.query) if (i != "page") queryString = `${queryString}&${i}=${req.query[i]}`;
                                if (!req.query.page) return res.redirect(`/browse/movies${queryString}&page=1`);

                                let curPage = parseInt(req.query.page);
                                let ttlPage = resMovies.length;
                                let pagination = {
                                    first: `${queryString}&page=1`,
                                    last: `${queryString}&page=${ttlPage}`,
                                    before: "",
                                    after: "",
                                    other: []
                                };
    
                                switch (curPage) {
                                    case 1:
                                        pagination.before = "#";
                                        pagination.after = `${queryString}&page=2`;
                                        for (var i=1; i<6 && i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
    
                                    case 2:
                                        pagination.before = `${queryString}&page=1`;
                                        pagination.after = `${queryString}&page=3`;
                                        for (var i=1; i<6 && i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
    
                                    case ttlPage-1:
                                        pagination.before = `${queryString}&page=${ttlPage-2}`;
                                        pagination.after = `${queryString}&page=${ttlPage}`;
                                        for (var i=ttlPage-4; i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
    
                                    case ttlPage:
                                        pagination.before = `${queryString}&page=${ttlPage-1}`;
                                        pagination.after = `#`;
                                        for (var i=ttlPage-4; i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
                                
                                    default:
                                        pagination.before = `${queryString}&page=${curPage-1}`;
                                        pagination.after = `${queryString}&page=${curPage+1}`;
                                        for (var i=curPage-2; i<=curPage+2; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
                                }
    
                                try {
                                    res.send(pug.renderFile(`${__dirname}/templates/browse.movies.pug`, {
                                        msg: "",
                                        pagination: pagination,
                                        user: req.session.user,
                                        movies: resMovies[curPage-1]
                                    }));
                                } catch (e) {res.redirect('/browse/movies')}
                            });
                        });
                    }
                    break;

                case "users":
                    if (req.params.sub) {   
                        let resUser = await model.getUsers(database, {_id: (req.params.sub.length == 24)?ObjectID(req.params.sub):""});
                        if (resUser.length == 0) res.redirect('/browse/users');
                        else {
                            try {
                                res.send(pug.renderFile(`${__dirname}/templates/browse.users.user.pug`, {
                                    msg: "",
                                    user: req.session.user,
                                    viewUser: resUser[0]
                                }));
                            } catch (e) {res.redirect('/browse/users')}
                        }
                    }
                    else {
                        let filter = {};
                        let p = Object.entries(req.query).map(q => {
                            switch (q[0].toLowerCase()) {
                                case "username":
                                case "name":
                                    filter[q[0]] = new RegExp(q[1], 'i');
                                    break;
        
                                default:
                                    break;
                            }
                        });

                        Promise.all(p).then(async () => {
                            let resUsers = [];
                            let allUsers = await model.getUsers(database, filter);
    
                            let n = 0;
                            let tempArr = [];
                            let p2 = allUsers.map(m => {
                                tempArr.push(m);
                                n++;
                                if (n % 15 == 0 || n == allUsers.length) {
                                    resUsers.push(tempArr);
                                    tempArr = [];
                                }
                            });
    
                            Promise.all(p2).then(() => {
                                let queryString = "?";
                                for (var i in req.query) if (i != "page") queryString = `${queryString}&${i}=${req.query[i]}`;
                                if (!req.query.page) return res.redirect(`/browse/users${queryString}&page=1`);

                                let curPage = parseInt(req.query.page);
                                let ttlPage = resUsers.length;
                                let pagination = {
                                    first: `${queryString}&page=1`,
                                    last: `${queryString}&page=${ttlPage}`,
                                    before: "",
                                    after: "",
                                    other: []
                                };
    
                                switch (curPage) {
                                    case 1:
                                        pagination.before = "#";
                                        pagination.after = `${queryString}&page=2`;
                                        for (var i=1; i<6 && i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
    
                                    case 2:
                                        pagination.before = `${queryString}&page=1`;
                                        pagination.after = `${queryString}&page=3`;
                                        for (var i=1; i<6 && i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
    
                                    case ttlPage-1:
                                        pagination.before = `${queryString}&page=${ttlPage-2}`;
                                        pagination.after = `${queryString}&page=${ttlPage}`;
                                        for (var i=ttlPage-4; i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
    
                                    case ttlPage:
                                        pagination.before = `${queryString}&page=${ttlPage-1}`;
                                        pagination.after = `#`;
                                        for (var i=ttlPage-4; i<=ttlPage; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
                                
                                    default:
                                        pagination.before = `${queryString}&page=${curPage-1}`;
                                        pagination.after = `${queryString}&page=${curPage+1}`;
                                        for (var i=curPage-2; i<=curPage+2; i++) pagination.other.push([i, `${queryString}&page=${i}`, (i == curPage)?"active":""]);
                                        break;
                                }
    
                                try {
                                    res.send(pug.renderFile(`${__dirname}/templates/browse.users.pug`, {
                                        msg: "",
                                        pagination: pagination,
                                        user: req.session.user,
                                        users: resUsers[curPage-1]
                                    }));
                                // } catch (e) {console.log(e)}
                                } catch (e) {res.redirect('/browse/users')}
                            });
                        });
                    }
                    break;

                default:
                    res.redirect('/home');
                    break;
            }
        }
    });

    app.listen(3000, () => console.log("Server started on port 3000"));
})
// .catch(err => console.error("Error while connecting to database"));
.catch(err => console.error(err));