const e = require('express');
var express = require('express');
const auth = require('../middleware/auth');

//Create router
var router = express.Router();
//Require user controller
const profileController = require("../controllers/profile");

/**
 * @swagger
 * /profile/:id :
 *   get:
 *     description: Returns a single user.
 *     parameters:
 *       - name: id
 *     produces:
 *       - application/json
 *     responses:
 *       400:
 *         description: User does not exist
 *       200:
 *         description: A user array with their respective details.
 */
router.get("/:id", async (req, res) => profileController.getOneUser(req, res));


module.exports = router;