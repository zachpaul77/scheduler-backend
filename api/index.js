require('dotenv').config()
const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')
const roomRoutes = require('../routes/roomRoutes')
const userRoutes = require('../routes/userRoutes')

const app = express()

// middleware
app.use(cors())
app.use(express.json())
//"https://schedge.netlify.app"

// routes
app.use('/api/room', roomRoutes)
app.use('/api/user', userRoutes)

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
