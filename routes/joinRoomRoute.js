const express = require('express')
const router = express.Router()

// Join room route
router.post('/:id', async(req, res) => {
    res.status(200).json({status: "joinRoom"})
})

module.exports = router
