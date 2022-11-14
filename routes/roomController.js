const Room = require('../models/roomModel')
const User = require('../models/userModel')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const mongoose = require('mongoose')
const cloudinary = require('../utils/cloudinary')

const room = {}


const getAuthorizedUser = async(req, res) => {
    // verify user is authenticated
    const { authorization } = req.headers

    if (!authorization) {
      res.status(401).json({error: 'Request is not authorized'})
      return false
    }
  
    const token = authorization.split(' ')[1]
  
    try {
      const { _id } = jwt.verify(token, process.env.SECRET)
      req.user = await User.findOne({ _id }).select('_id')
      return req.user
    } catch (error) {
      console.log(error)
    }

    res.status(401).json({error: 'Request is not authorized'})
    return false
}

const getMemberFromID = async(roomId, memberId, res) => {
  try {
    if (mongoose.Types.ObjectId.isValid(roomId)) {
      const memberList = await Room.where("_id").equals(roomId).select("members")
      const mIndex = memberList[0].members.findIndex(m => m._id.toString() === memberId)
  
      if (memberList) {
        return {memberList, mIndex}
      }
    }
  } catch (e) {
    console.log(e)
  }

  res.status(404).json({error: 'Room does not exist'})
  return false
}

const getRoomFromID = async(room_id, res) => {
  try {
    if (mongoose.Types.ObjectId.isValid(room_id)) {
      const room = await Room.findOne({_id: room_id})
      if (room) {
        return room
      }
    }
  } catch (e) {
    console.log(e)
  }

  res.status(404).json({error: 'Room does not exist'})
  return false
}

// get all rooms
room.getRooms = async(req, res) => {
  try {
  const authorizedUser = await getAuthorizedUser(req, res)
  if (!authorizedUser) return

    const owner_id = authorizedUser._id
    const rooms = await Room.find({owner_id}).sort({updatedAt: -1})
    res.status(200).json(rooms)
  } catch (e) {
    res.status(400).json({error: e.message})
  }
}

// Get a room from code
room.getRoom = async(req, res) => {
  try {
    const { room_id } = req.body

    const room = await getRoomFromID(room_id, res)
    if (room) {
      res.status(200).json(room)
    }
  } catch (e) {
    console.log(e)
    res.status(400).json({error: e.message})
  }

}

// Create a room
room.createRoom = async(req, res) => {
  try {
    const authorizedUser = await getAuthorizedUser(req, res)
    if (!authorizedUser) return
    const {roomName, schedule} = req.body
  
    if(!roomName) {
      return res.status(400).json({ error: 'Please fill in all the fields'})
    }
    if (schedule.dates.length > 31) {
      return res.status(400).json({error: "Error: Rooms have a max of 31 days"})
    }

    // Check duplicate room names
    const owner_id = authorizedUser._id
    const rooms = await Room.find({owner_id})
    for (let room of rooms) {
      if (room.name === roomName) {
        return res.status(400).json({error: "room already exists"})
      }
    }

    const room = await Room.create({
      name: roomName,
      owner_id,
      schedule
    })
    res.status(200).json(room)
  } catch (error) {
    console.log(error.message)
    res.status(400).json({error: error.message})
  }
}

// Create a member
room.createMember = async(req, res) => {
  try {
    const { id } = req.params
    const room = await getRoomFromID(id, res)
    if (!room) return
    const { member } = req.body

    // Check for duplicate member names
    for (let roomMember of room.members) {
      if (roomMember.name === member.name) {
        return res.status(400).json({error: "Member name already exists."})
      }
    }

    member.groups.unshift('All')
    room.members.push(member)
    await room.save()
    const latestMember = room.members[room.members.length-1]
    res.status(200).json(latestMember)
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Create a group
room.createGroup = async(req, res) => {
  try {
    const { id } = req.params
    const room = await getRoomFromID(id, res)
    if (!room) return
    const { group } = req.body
    
    // Check for duplicate group names
    for (let roomGroup of room.groups) {
      if (roomGroup.name === group.name) {
        return res.status(400).json({error: "Group name already exists."})
      }
    }
    
    // add group to room db
    room.groups.push(group)
    await room.save()
    const latestGroup = room.groups[room.groups.length-1]
    res.status(200).json(latestGroup)
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Delete a group
room.deleteGroup = async(req, res) => {
  try {
    const { id } = req.params
    const room = await getRoomFromID(id, res)
    if (!room) return
    const { groupName } = req.body

    // delete group from members
    room.members.map(m => {
      m.groups = m.groups.filter(group => group !== groupName)
    })
    room.groups = room.groups.filter(group => group.name !== groupName)

    room.save()
    res.status(200).json({success: 'deleted group'})
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Set a schedule
room.setSchedule = async(req, res) => {
  try {
    const { id } = req.params
    const room = await getRoomFromID(id, res)
    if (!room) return
    const { schedule, removeMemberSchedules } = req.body

    if (schedule.times.begin > schedule.times.end) {
      return res.status(400).json({error: "Error: End time is before start time"})
    }
    if (schedule.dates.length > 31) {
      return res.status(400).json({error: "Error: Rooms have a max of 31 days"})
    }

    room.schedule = schedule
    if (removeMemberSchedules) {
      // Remove all member schedules
      room.members.map((member) => {
        member.time_slots = []
      })
    }
    await room.save()
    res.status(200).json(room.schedule)
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Set a member's schedule
room.setMemberSchedule = async(req, res) => {
  try {
    const { id } = req.params
    const { timeSlots } = req.body
    const mongodb = await getMemberFromID(id, timeSlots.memberId, res)
    if (!mongodb) return

    let memberTimeSlots = mongodb.memberList[0].members[mongodb.mIndex].time_slots

    if (timeSlots.isSet) {
      memberTimeSlots.addToSet(...timeSlots.dateTimes)
    } else {
      memberTimeSlots = memberTimeSlots.filter(slot => !timeSlots.dateTimes.includes(slot))
    }
    mongodb.memberList[0].members[mongodb.mIndex].time_slots = memberTimeSlots
    
    mongodb.memberList[0].save()
    res.status(200).json(memberTimeSlots)
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Update a member's groups
room.updateMemberGroups = async(req, res) => {
  try {
    const { id } = req.params
    const {groups, memberId} = req.body
    const mongodb = await getMemberFromID(id, memberId, res)
    if (!mongodb) return

    mongodb.memberList[0].members[mongodb.mIndex].groups = groups
    mongodb.memberList[0].save()

    res.status(200).json({success: 'successfully saved member groups'})
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Update a member's profile picture
room.getCloudinarySignature = async(req, res) => {
  try {
    const { id } = req.params
    const room = await getRoomFromID(id, res)
    if (!room) return

    const { memberId } = req.body

    const timestamp = new Date().getTime()
    const signature = await cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: `schedule/room/${id}`,
        public_id: memberId,
        transformation: 'w_30,h_30'
      },
      process.env.CLOUD_KEY_SECRET
    )

    res.status(200).json({timestamp, signature})
  }
  catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Update a member's profile picture
room.updateMemberProfileImg = async(req, res) => {
  try {
    const { id } = req.params
    const {memberId, imgURL} = req.body
    const mongodb = await getMemberFromID(id, memberId, res)
    if (!mongodb) return

    mongodb.memberList[0].members[mongodb.mIndex].profile_img = imgURL
    mongodb.memberList[0].save()

    res.status(200).json({success: 'successfully saved member profile img'})
  }
  catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Reset member's custom profile picture to default
room.clearMemberProfileImg = async(req, res) => {
  try {
    const { id } = req.params
    const { newProfileImg, memberId } = req.body
    const mongodb = await getMemberFromID(id, memberId, res)
    if (!mongodb) return

    mongodb.memberList[0].members[mongodb.mIndex].profile_img = newProfileImg
    mongodb.memberList[0].save()

    res.status(200).json({success: 'cleared member profile_img'})
  }
  catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Delete a member
room.deleteMember = async(req, res) => {
  try {
    const { id } = req.params
    const { memberId } = req.body
    const mongodb = await getMemberFromID(id, memberId, res)
    if (!mongodb) return

    mongodb.memberList[0].members = mongodb.memberList[0].members.filter(member => member._id.toString() !== memberId)
    mongodb.memberList[0].save()
    cloudinary.uploader.destroy(`schedule/room/${id}/${memberId}`)

    res.status(200).json({success: 'deleted member'})
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Delete a room
room.deleteRoom = async(req, res) => {
  try {
    const authorizedUser = await getAuthorizedUser(req, res)
    if (!authorizedUser) return
    const { id } = req.params
  
    if (mongoose.Types.ObjectId.isValid(id)) {
      const room = await Room.findOneAndDelete({_id: id})
      if (room) {
        await cloudinary.api.delete_resources_by_prefix(`schedule/room/${id}`, {all: true})
        cloudinary.api.delete_folder(`schedule/room/${id}`)
        return res.status(200).json({success: `successfully deleted ${room.name}`})
      }
    }

    res.status(404).json({error: 'No room found'})
  } catch (e) {
    console.log(e.message)
    res.status(404).json({error: 'Error deleting room'})
  }
}


module.exports = room