const Users = require('../models/users');
const FileHandler = require("../controllers/files");

const createProject = async (req, res) => {
    var username = req.user.username; // from jwt
    var title = req.body.title;
    var text = req.body.text;
    var tags = req.body.tags;

    // constraint on project naming, must be >= 3 chars
    if (title.length < 3) {
        return res.status(400).json({msg:"project name must be >= 3 characters"});
    }

    var newProject = {
        title: title,
        text: text,
        attachments: [],  // new project has no attachments
        tags: tags
    }

    // first, check if the user exists: this shouldn't happen though as we are getting the username from the jwt
    const userExistsErr = await Users.findOne({username})
        .then(user => {
            if (user == null) {
                return res.status(404).json({msg:"Cannot create project as user does not exist."});
            }
        },
        user => {return user;} )
    if (userExistsErr) { return userExistsErr; }

    // see if the user has a project by that title, unless we want to use some other kind of id?
    const projExistsErr = await Users.collection.findOne(
        // {"projects": {
        //     $elemMatch: {
        //         "title": title
        //     }
        // }}
        {"username": username, "projects.title": { "$in": [title]} }
    )    
    .then(user => {
        if (user) {
            return res.status(400).json( {msg:"There is already a project with that name belonging to the user."} );
        }
    })
    .catch(user => {console.log(user);});
    if (projExistsErr) { return projExistsErr; }


    // insert this project into DB
    Users.collection.findOneAndUpdate(
        { username: username },
        { $push: {projects: newProject } },
        (err, success) => {
            if (err) { 
                return res.json({msg:"Database error: Cannot create project."}).status(500);
            } else {
                // console.log("\n\033[31mSuccessfully created project:\033[0m");
                // console.log(success);
                // console.log(newProject);
                return res.status(201).json( {msg:"Created new project and inserted into database."});
            }
        }
    )
};

/*
 * edit a user project. Does not allow for the changing of the title to one that
 * is already used by another project of the user, as title is the primary key.
 */
const editProject = async (req, res) => {
  //from the auth middleware, having jwt in header returns username

  //get user information from the username
  const user = await Users.findOne({ username: req.user.username});
  if(!user) return res.status(400).json({msg: 'Could not find username in database'});

  //loop through all projects, find specific project based off project-id
  try{
    for (const project of user.projects){
      if(project.title == req.params.id){
  
        if(req.body.title != null){
          // ensure that no other project has this title, or else we would get clashing PKs
          // await because we want to check this one first
          const search = await Users.findOne({"username": req.user.username, "projects.title": { "$in": [req.body.title]} })
          if (search) {
            return res.status(400).json({msg: "Cannot update project, as another project already has this title."});
          } else {
            project.title = req.body.title;
          }
        }
        if(req.body.text != null){
          project.text = req.body.text;
        }
        if(req.body.tags != null){
          project.tags = req.body.tags;
        }
  
        //save user to database
        user.save()
        return res.status(200).send(project);
      }
    };
    return res.status(400).json({msg: 'Could not find specified project-id for user'});
    
  } catch(err){
    return res.status(400).json({msg: 'Could not find specified project-id for user'});
  }
};


/* wrapper over deleteProject that allows it to be called from a route 
 * delete a user's project and remove all of the attachments from AWS
 * req.user comes from jwt from auth 
 */
const deleteProjectRoute = async (req, res) => {
  deleteProject(req.user, req.params.id , (ret) => {
    return res.status(ret.code).json({msg:ret.msg});
  })
}


// todo check that this still works for regular delete project, i hope so
/* delete a user's project and all of the attachments on AWS associated with it */
const deleteProject = async (user, title, callback) => {
    var username = user.username;

    // see if the user has a project by that title
    const search = await Users.findOne({"username": username, "projects.title": { "$in": [title]} })
    if (search) {     // remove it     
        FileHandler.deleteProjectFiles(username, title, (err) => {
          if (err) {
            callback({code:500, msg: "could not delete project files"})
            return
          } else {
            // search.projects = search.projects.filter( el => el.title !== title);
            // search.save();  // save or update throw concurrency erros / fail
            Users.findByIdAndUpdate(search._id, 
              { $pull: { "projects": { "title": title } } }, 
              { useFindAndModify: false }
            ).then( () => {
              callback({code:200, msg: "Successfully deleted project."})
              return;
            }).catch( () => {
              callback({code:500, msg: "could not delete project files"});
              return
            })
          }
        })

    } else {
        // project does not exist
        callback({code:404, msg: 'Could not find specified project-id for user.'} ); // we know the user should exist because it was passed in from jwt
        return 
    }
};

/* get every project in the database 
   format is {username: username, project: {projectObject}}
   - tested with users with no projects and differing lengths 
 */
const getAllProjects = async (req, res) => {
  Users.find({})
  .then( users => {
    // make up array: at some point a faster algorithm should be used but this is fine for now 
    projects = [];
    for (var user of users){
      for (var proj of user.projects) {
        projects.push({username: user.username, project: proj});
      }
    }
    return res.status(200).send(projects);
  })
  .catch( err => {
    return res.status(500).json({msg: "Cannot connect to database."})
  });
}

/* view all projects of a logged in user */
const loggedInUserProjects = async (req, res) => {
  const user = await Users.findOne({ username: req.user.username});

  if (!user) { // this looks for the logged in user, so it should always exist
    return res.status(500).json({msg: 'database error: could not find user'});
  }
  return res.status(200).json(user.projects);
}

module.exports = {
    createProject,
    deleteProject,
    deleteProjectRoute,
    editProject,
    getAllProjects,
    loggedInUserProjects
}