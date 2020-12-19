const mc = require('mongodb').MongoClient;

mc.connect("mongodb://localhost:27017/", (err, client) => {
    if (err) throw err;

    client.db("movies-database").dropDatabase((err, result) => {
        if (err) throw err;
        let users = require('./users.json');
        let movies = require('./movie-data.json');

        client.db("movies-database").collection("users").insertMany(users).then(() => {
            client.db("movies-database").collection("movies").insertMany(movies).then(() => {
                console.log("DONE")
            });
        });
    });
});