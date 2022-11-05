const mongoose = require('mongoose')

const Schema = mongoose.Schema

const groupSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  profile_img: {
    type: Boolean,
    default: false
  },
  all: {
    type: Boolean,
    default: false
  },
})

const memberSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  profile_img: {
    type: String,
    default: ''
  },
  groups: {
    type: [String]
  },
  time_slots: [Number],
})

const roomSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  profile_img: {
    type: Boolean,
    default: false
  },
  owner_id: {
    type: String,
    required: true,
  },
  schedule: {
    dates: {
      type: [Number]
    },
    times: {
      begin: {
        type: Number,
        min: 0,
        max: 23
      },
      end: {
        type: Number,
        min: 0,
        max: 23
      },
      total: {
        type: Number,
        min: 0,
        max: 24
      }
    }
  },
  members: {
    type: [memberSchema],
  },
  groups: {
    type: [groupSchema],
    default: [{name: "All", description: "All participants.", all: true}]
  }
}, { timestamps: true })


module.exports = mongoose.model('Room', roomSchema)