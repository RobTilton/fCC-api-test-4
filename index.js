const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');

app.use(cors())
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI);

const db= mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connection Successful");
});

// Schema

const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  exercises: [exerciseSchema]
});
// Model
const User = mongoose.model('User', userSchema);


const newUser = new User({ username: 'newuser'});
newUser.save()
.then(() => console.log('User Saved Successfully'))
.catch(err => console.error(err));

// POST route to create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  User.findOne({ username: username })
  .then(existingUser => {
    if (existingUser) {
      return res.status(400).send('Username Already Exists');
    }
    const newUser = new User({ username });
    return newUser.save();
    })
    .then(savedUser => res.json({ username: savedUser.username, _id: savedUser._id}))
    .catch(err => res.status(500).send(err));
  });

// GET route to list all users
app.get('/api/users', (req, res) => {
  User.find({}, 'username _id')
  .then(users => res.json(users))
  .catch(err => res.status(500).send(err));
});

// Post Exercise
app.post('/api/users/:_id/exercises', (req, res) => {
  const { description, duration, date } = req.body;
  const exercise = {
    description,
    duration,
    date: date ? new Date(date): new Date()
  };

  User.findById(req.params._id)
    .then(user => {
      if (!user) {
        return res.status(404).send('User Not Found');
      }
      user.exercises.push(exercise);
      return user.save(); 
    })
    .then(updatedUser => {
      const addedExercise = updatedUser.exercises[updatedUser.exercises.length - 1 ];
      res.json({
        username: updatedUser.username,
        description: addedExercise.description, 
        duration: addedExercise.duration,
        date: addedExercise.date.toDateString(),
        _id: updatedUser._id 
    });
    })
    .catch(err => res.status(500).send(err.message));
});

// GET exercises logs
app.get('/api/users/:_id/logs', (req, res) => {
  const { from, to, limit } = req.query;
  const query = {
    _id: req.params._id
  };

  User.findById(query)
    .then(user => {
      if (!user) {
        return res.status(404).send('User not found');
      }
      let exercises = user.exercises;

      if (from) {
        const fromDate = new Date(from);
        exercises = exercises.filter(ex => new Date(ex.date) >= fromDate);
      }
      if (to) {
        const toDate = new Date(to);
        exercises = exercises.filter(ex => new Date(ex.date) <= toDate);
      }
      if (limit) {
        exercises = exercises.slice(0, parseInt(limit));
      }

      const log = exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString()
      }));

      res.json({
        _id: user._id,
        username: user.username,
        count: exercises.length,
        log: log
      });
    })
    .catch(err => res.status(500).send(err.message));
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})