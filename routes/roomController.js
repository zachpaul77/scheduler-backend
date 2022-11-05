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

const getRoomFromID = async(room_id, res) => {
  if (mongoose.Types.ObjectId.isValid(room_id)) {
    const room = await Room.findOne({_id: room_id})
    if (room) {
      return room
    }
  }

  res.status(404).json({error: 'Room does not exist'})
  return false
}

// get all rooms
room.getRooms = async(req, res) => {
  const authorizedUser = await getAuthorizedUser(req, res)
  if (!authorizedUser) return

  try {
    const owner_id = authorizedUser._id
    const rooms = await Room.find({owner_id}).sort({updatedAt: -1})
    res.status(200).json(rooms);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}

// Get a room from code
room.getRoom = async(req, res) => {
  const { room_id } = req.body

  const room = await getRoomFromID(room_id, res)
  if (room) {
    res.status(200).json(room)
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

    // Check duplicate room names
    const owner_id = authorizedUser._id
    const rooms = await Room.find({owner_id})
    for (let room of rooms) {
      if (room.name === roomName) {
        return res.status(400).json({error: "room name already exists"})
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
    const currentRoom = await Room.where("_id").equals(id)
    currentRoom[0].members.map(m => {
      m.groups = m.groups.filter(group => group !== groupName)
    })
    currentRoom[0].groups = currentRoom[0].groups.filter(group => group.name !== groupName)

    await currentRoom[0].save()
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
      return res.status(400).json({error: "End time is before start time"})
    }
    room.schedule = schedule
    if (removeMemberSchedules) {
      // Remove all member schedules
      let membersList = await Room.where("_id").equals(id).select("members")
      membersList[0].members.map((member) => {
        member.time_slots = []
      })
      await membersList[0].save()
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
    const room = await getRoomFromID(id, res)
    if (!room) return
    const { timeSlots } = req.body

    let memberList = await Room.where("_id").equals(id).select("members")
    const mIndex = memberList[0].members.findIndex(m => m._id.toString() === timeSlots.memberId)
    let memberTimeSlots = memberList[0].members[mIndex].time_slots

    if (timeSlots.isSet) {
      memberTimeSlots.addToSet(...timeSlots.dateTimes)
    } else {
      memberTimeSlots = memberTimeSlots.filter(slot => !timeSlots.dateTimes.includes(slot));
    }
    memberList[0].members[mIndex].time_slots = memberTimeSlots
    await memberList[0].save()
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
    const room = await getRoomFromID(id, res)
    if (!room) return
    const {groups, memberId} = req.body

    const memberList = await Room.where("_id").equals(id).select("members")
    const mIndex = memberList[0].members.findIndex(m => m._id.toString() === memberId)
    memberList[0].members[mIndex].groups = groups
    
    await memberList[0].save()
    res.status(200).json(groups)
  } catch (e) {
    console.log(e.message)
    res.status(400).json({error: e.message})
  }
}

// Update a member's profile picture
room.updateMemberProfileImg = async(req, res) => {
  try {
    const { id } = req.params
    const room = await getRoomFromID(id, res)
    if (!room) return

    const memberId = req.file.originalname
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'schedule/room/'+id,
      public_id: memberId,
      width: 30,
      height: 30
    })
    fs.unlink(req.file.path, ()=>{})

    const memberList = await Room.where("_id").equals(id).select("members")
    const mIndex = memberList[0].members.findIndex(m => m._id.toString() === memberId)
    memberList[0].members[mIndex].profile_img = result.url
    await memberList[0].save()

    res.status(200).json(result.url)
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
    const room = await getRoomFromID(id, res)
    if (!room) return
    const { newProfileImg, memberId } = req.body

    const memberList = await Room.where("_id").equals(id).select("members")
    const mIndex = memberList[0].members.findIndex(m => m._id.toString() === memberId)
    memberList[0].members[mIndex].profile_img = newProfileImg
    await memberList[0].save()

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
    const room = await getRoomFromID(id, res)
    if (!room) return
    const { memberId } = req.body

    const memberList = await Room.where("_id").equals(id).select("members")
    memberList[0].members = memberList[0].members.filter(member => member._id.toString() !== memberId)
    await memberList[0].save()

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
        return res.status(200).json(room)
      }
    }
    res.status(404).json({error: 'No such room'})
    
  } catch (e) {
    console.log(e.message)
    res.status(404).json({error: 'Error deleting room'})
  }
}


module.exports = room