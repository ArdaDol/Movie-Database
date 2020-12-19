module.exports = {
    getMovies: (db, filter={}) => {
        return new Promise((resolve, reject) => {
            db.collection("movies").find(filter).toArray()
                .then(arr => resolve(arr))
                .catch(err => reject(err))
        });
    },

    getUsers: (db, filter) => {
        return new Promise((resolve, reject) => {
            db.collection("users").find(filter).toArray()
                .then(arr => resolve(arr))
                .catch(err => reject(err))
        });
    },

    login: (db, username, password) => {
        return new Promise((resolve, reject) => {
            db.collection("users").find({username: username}).toArray()
                .then(arr => {
                    if (arr.length == 0) resolve(false);
                    else {
                        if (arr[0].password == password) resolve(true);
                        else resolve(false);
                    }
                })
        });
    },

    makeUser: (db, user) => {
        return new Promise((resolve, reject) => {
            db.collection("users").find({username: user.username}).toArray()
                .then(arr => {
                    if (arr.length != 0) resolve(false);
                    else db.collection("users").insertOne({
                        username: user.username,
                        password: user.password,
                        avatar: "https://lh3.googleusercontent.com/-JM2xsdjz2Bw/AAAAAAAAAAI/AAAAAAAAAAA/DVECr-jVlk4/photo.jpg",
                        followers: [],
                        following: [],
                        movies: []
                    }).then(() => resolve(true)).catch(() => resolve(false));
                })
        });
    },

    makeMovie: (db, movie) => {
        return new Promise((resolve, reject) => {
            db.collection("movies").insertOne({
                Title: movie.Title,
                Released: movie.Released,
                Runtime: movie.Runtime,
                Genres: movie.Genres,
                Directors: movie.Directors,
                Writers: movie.Writers,
                Poster: movie.Poster,
                Plot: movie.Plot
            })
            .then(() => resolve(true))
            .catch(() => resolve(false));
        });
    }
}