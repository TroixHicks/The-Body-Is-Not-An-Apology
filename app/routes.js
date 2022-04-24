module.exports = function(app, passport, db, multer, ObjectId, sonyaEntry) {

   //MULTER =======================================================================
   const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now() + ".png")
    }
  });

  let upload = multer({ storage: storage });
// normal routes ===============================================================

    // show the landing page(will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs');
        
    });

    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
        db.collection('messages').find().toArray((err, result) => {
          if (err) return console.log(err)
          res.render('profile.ejs', {
            user : req.user,
            messages: result
          })
        })
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

//multer ===============================================================
app.post('/imageUpload', upload.single('file-to-upload'), (req, res, next) => {
  addImage(db, req, '/uploads/' + req.file.filename, () => {
    res.redirect('/profile')
  });
});

var addImage = function (db, req, filePath, callback) {
  var collection = db.collection('users');
  var uId = ObjectId(req.session.passport.user)
  collection.findOneAndUpdate({
    "_id": uId
  }, {
    $set: {
      "local.img": filePath
    }
  }, {
    sort: {
      _id: -1
    },
    upsert: false
  }, (err, result) => {
    if (err) return res.send(err)
    callback(result)
  })
}
// message board routes ===============================================================

    app.post('/messages', (req, res) => {
      db.collection('messages').insertOne({name: req.body.name, msg: req.body.msg, thumbUp: 0, thumbDown:0}, (err, result) => {
        if (err) return console.log(err)
        console.log('saved to database')
        res.redirect('/profile')
      })
    })

    app.put('/messages', (req, res) => {
      db.collection('messages')
      .findOneAndUpdate({name: req.body.name, msg: req.body.msg}, {
        $set: {
          thumbUp:req.body.thumbUp + 1
        }
      }, {
        sort: {_id: -1},
        upsert: true
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
      })
    })

    app.delete('/messages', (req, res) => {
      db.collection('messages').findOneAndDelete({name: req.body.name, msg: req.body.msg}, (err, result) => {
        if (err) return res.send(500, err)
        res.send('Message deleted!')
      })
    })
// the routes for sonya's ability to post ===============================================================
app.get('/sonyasPage', isLoggedIn, function(req, res) {
        db.collection('sonyasPostings').find().toArray((err, result) => {
          if (err) return console.log(err)
          res.render('sonyasPage.ejs', {
            user : req.user,
            messages: result
          })
        })
    });

app.post('/sonyasPosts', (req, res) => {
      db.collection('sonyasPostings').insertOne({name: req.body.name, msg: req.body.msg, title: req.body.title, description: req.body.description, thumbUp: 0, thumbDown:0}, (err, result) => {
        if (err) return console.log(err)
        console.log('saved to database')
        res.redirect('/homePage')
      })
    })


// routes for individual posting pages ==============================================================
app.get('/indivSonyaPost', isLoggedIn, function (req, res) {

    let postId = req.query.id
    console.log('postid =', postId, req)
    db.collection('sonyasPostings').findOne({ _id: ObjectId(postId) }, (err, result) => {
      if (err) return console.log(err)
        console.log(result)
        res.render('indivSonyaPost.ejs', {
          user: req.user,
          sonyasPostings: result
        })
      })
  });

  // app.get('/indivSonyaPost', isLoggedIn, function (req, res) {

  //   let postId = req.query.id
  //   console.log('postid =', postId, req)
  //   db.collection('housingPost').findOne({ _id: ObjectId(postId) }, (err, result) => {
  //     if (err) return console.log(err)
  //     db.collection('comments').find({ postId: ObjectId(postId) }).toArray((err, comments) => {
  //       if (err) return console.log(err)
  //       console.log(result)
  //       res.render('housingPost.ejs', {
  //         comments: comments,
  //         user: req.user,
  //         housingPost: result
  //       })
  //     })
  //   })
  // });

// route for commenting on sonyas page

app.post('/makeCommentSonyaPost/:id', (req, res) => {
  console.log("this is the body" + req.body)

    // let user = req.user.userName
    db.collection('comments').insertOne({ comment: req.body.comment, postedBy: req.body.userEmail, postedById: req.user._id, postId: ObjectId(req.params.id) }, (err, result) => {
      if (err) return console.log(err)
      console.log('saved to database')
      res.redirect(`/indivSonyaPost`)
    })
  })
//routes for homepage ==============================================================

app.get('/homePage', isLoggedIn, function(req, res) {
        db.collection('sonyasPostings').find().toArray((err, result) => {
          if (err) return console.log(err)
          res.render('homePage.ejs', {
            user : req.user,
            sonyasPostings: result,
          })
        })
    });

// users route to save post

//saving savesonya post

app.put('/saveSonyaPost', isLoggedIn, (req, res) => {
    db.collection('sonyasPostings')
      .findOneAndUpdate({ _id: ObjectId(req.body.postId) }, {
        $addToSet: {
          interestedUsers: ObjectId(req.user.id)
        }
      }, {
        sort: { _id: -1 },
        upsert: false
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
      })
  })

  // rendering her posts on a page

  app.get('/savedPosts', isLoggedIn, function (req, res) {
    db.collection('sonyasPostings').find({interestedUsers: ObjectId(req.user.id)}).toArray((err, result) => {
      if (err) return console.log(err)
      console.log(result)
      res.render('savedPosts.ejs', {
        user : req.user,
        sonyasPostings: result,
      })
    })
  });


    

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
        // LOGIN ===============================
        // show the login form
        app.get('/login', function(req, res) {
            res.render('login.ejs', { message: req.flash('loginMessage') });
        });

        // process the login form
        app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

        // SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        // process the signup form
        app.post('/signup', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}

// route middleware to validate if it's sonya so only she can post
function isSonyaTheUser(req, res, next) {
//logic that checks if the user's id is correctly matching sonyas
  if (req.user.local.email == sonyaEntry)
//allows them to continue with where they were trying to do. 
    return next();
//will redirect user to profile if they are not sonya
  res.redirect('/profile');
}
