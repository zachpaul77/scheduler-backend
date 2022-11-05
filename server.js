require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const roomRoutes = require('./routes/roomRoutes')
const userRoutes = require('./routes/userRoutes')
const joinRoomRoute = require('./routes/joinRoomRoute')

const app = express()

// middleware
app.use(express.json())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://schedge.netlify.app")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

// routes
app.use('/api/room', roomRoutes)
app.use('/api/user', userRoutes)
app.use('/', joinRoomRoute)
app.use('/images', express.static('images'))

// connect to db
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('connected to database')
    // listen to port
    app.listen(process.env.PORT, () => {
      console.log('listening for requests on port', process.env.PORT)
    })
  })
  .catch((err) => {
    console.log(err)
  })