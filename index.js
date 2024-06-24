const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

//connect to the database
const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect(process.env.MONGO_URL)

//create Schemas for this project
//first schema is a user schema
const userSchema = new Schema({
  username: String,
});
const User = mongoose.model("User", userSchema);

//second schema is an exercise schema
const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

//third schema is a log schema
/*const logSchema = new Schema({
  count: Number,
  log: [{description: String,
  duration: Number,
  date: Date
  }]
});*/


app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//get list of users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users){
    res.send("No users");
  } else {
    res.json(users);
  }
})

//store users in the database
app.post("/api/users", async (req, res) => {
  const userObj = new User({
    username: req.body.username
  })
//to catch any errors, we can place this in a try/catch statment
  try{
    const user = await userObj.save()
    console.log(user);
    res.json(user)
  }catch(err){
    console.log(err)
  }
})

//store excersises in the database
app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body

  try{
    const user = await User.findById(id)

    //if no user can be found
    if (!user){
      res.send("Could not find user")
    //if a user can be found
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        //if a date is provided, make it a new date, otherwise insert today's date
        date: date ? new Date(date) : new Date()
      })

      //send the response
      const exercise = await exerciseObj.save()
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        //this date portion is required for how we want to format the date
        date: new Date(exercise.date).toDateString()
      })
    }
  }catch(err){
    console.log(err);
    res.send("There was an issue saving the exercise")
  }
})

//get user logs
app.get("/api/users/:_id/logs", async (req, res) => {
  //we can see that this req.query will return from, to and limit based off the information that freeCodeCamp gives us
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if(!user){
    res.send("Could not find user")
    return;
  }

  let dateObj = {}
  if (from) {
    dateObj["$gte"] = new Date(from)
  }
  if (to) {
    dateObj["$lte"] = new Date(to)
  }
  let filter = {
    user_id: id
  }
  if(from || to){
    filter.date = dateObj;
  }

  //search through the database and respond with a log of exercises based off of the user id
  const excersises = await Exercise.find(filter).limit(+limit ?? 500)
  //needd to map the log so that it formats correctly
  const log = excersises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: excersises.length,
    _id: user._id,
    log
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
