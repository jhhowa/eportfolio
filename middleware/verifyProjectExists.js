// projects middleware
// verifies that a user (verified via JWT auth) has the project given by req.params.projectid

const Users = require("../models/users")

function verifyProjectExists(req, res, next) {
    Users.collection.findOne({username: req.user.username, "projects.title": { "$in": [req.params.projectid]} })
    .then((project) => {
        if (project) {
            next();     // project found means that the target project exists
        } else {
            return res.status(404).json({msg:"Could not find specified project-id for user."});
        }
    })
}

module.exports = verifyProjectExists;
