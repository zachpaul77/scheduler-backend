const express = require('express')
const room = require('./roomController')
const multer = require("multer");
//const requireAuth = require('../middleware/requireAuth')

const router = express.Router()
// Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `temp-data/`)
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
const upload = multer({ storage: storage, limits: {fileSize: 5000000 /*5mb*/}})

// require auth for all room routes
//router.use(requireAuth)

// Get all rooms from user
router.get('/rooms', room.getRooms)

// Get room from user
router.post('/', room.getRoom)

// Create room
router.post('/create', room.createRoom)

// Create member
router.post('/create_member/:id', room.createMember)

// Update member times
router.post('/set_member_schedule/:id', room.setMemberSchedule)

// Update member groups
router.post('/update_member_groups/:id', room.updateMemberGroups)

// Update member profile image
router.post('/update_member_img/:id', upload.single('image'), room.updateMemberProfileImg)

// Reset member's custom profile picture to default
router.post('/clear_member_img/:id', room.clearMemberProfileImg)

// Delete member
router.post('/delete_member/:id', room.deleteMember)

// Create room group
router.post('/create_group/:id', room.createGroup)

// Create room group
router.post('/delete_group/:id', room.deleteGroup)

// Set schedule
router.post('/set_schedule/:id', room.setSchedule)

// Delete room
router.delete('/:id', room.deleteRoom)

module.exports = router