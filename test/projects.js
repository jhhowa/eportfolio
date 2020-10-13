let mongoose = require("mongoose");
let User = require('../models/users');

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../app');
let should = chai.should();


chai.use(chaiHttp);
//Our parent block
describe('Projects', () => {
    beforeEach((done) => { //Before each test we empty the database
        User.deleteOne({}, (err) => {
           done();
        });
    });
/*
  * Test the /POST route for updating a project
  */
 describe('/POST update project for /projects/edit/{title}', () => {
  it('it should successfully update a specified title', (done) => {
    let registerUser = {
      "username": "reg123",
      "email": "reg123@gmail.com",
      "password": "reg123",
      "firstname": "reg123",
      "lastname": "reg123"
    }
    let project = {
        "title": "project",
        "text": "first project!!!",
        "tags": [
          {
            "tag": "test"
          },
          {
            "tag": "two tags"
          }
        ]
      }
    let updatedProject = {
        "title": "updatedProject",
        "text": "updating the first project",
        "tags": [
          {
            "tag": "one tag"
          },
        ]
      }
  chai.request(app)
      .post('/users/signup')
      .send(registerUser)
      .end((err, res) => {
        res.should.have.status(200);
        let jwt = res.body.token;

        chai.request(app)
        .post('/projects/create')
        .set('x-auth-token', jwt)
        .send(project)
        .end((err, res) => {
          res.should.have.status(201);

          let title = "project";

          chai.request(app)
          .post('/projects/edit/'+ title)
          .set('x-auth-token', jwt)
          .send(updatedProject)
          .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('title').eql('updatedProject');
              done();
          })
        });
      }) 
  });
  it('it should not update project as user does not have that project', (done) => {
    let registerUser = {
      "username": "reg2",
      "email": "reg2@gmail.com",
      "password": "reg2",
      "firstname": "reg2",
      "lastname": "reg2"
    }
    let project = {
        "title": "money makes the world go round",
        "text": "first project!!!",
        "tags": [
          {
            "tag": "test"
          },
          {
            "tag": "two tags"
          }
        ]
      }
    let updatedProject = {
    "title": "updatedProject",
    "text": "updating the first project",
    "tags": [
        {
        "tag": "one tag"
        },
    ]
    }
  chai.request(app)
      .post('/users/signup')
      .send(registerUser)
      .end((err, res) => {
        res.should.have.status(200);
        let jwt = res.body.token;

        chai.request(app)
        .post('/projects/create')
        .set('x-auth-token', jwt)
        .send(project)
        .end((err, res) => {
          res.should.have.status(201);

          let title = "unavailableProject";

          chai.request(app)
          .post('/projects/edit/'+ title)
          .set('x-auth-token', jwt)
          .send(updatedProject)
          .end((err, res) => {
              res.should.have.status(400);
              res.body.should.have.property('msg').eql('Could not find specified project-id for user');
              done();
          })
        });
      }) 
  });
});
/*
  * Test the /POST route for creating a project
  */
 describe('/POST update project for /projects/create', () => {
  it('it should successfully create a new project', (done) => {
    let registerUser = {
      "username": "regCreateProject",
      "email": "regCreateProject@gmail.com",
      "password": "regCreateProject",
      "firstname": "regCreateProject",
      "lastname": "regCreateProject"
    }
    let project = {
        "title": "CreateProject",
        "text": "first project!!!",
        "tags": [
          {
            "tag": "test"
          },
        ]
      }
  chai.request(app)
      .post('/users/signup')
      .send(registerUser)
      .end((err, res) => {
        res.should.have.status(200);
        let jwt = res.body.token;

        chai.request(app)
        .post('/projects/create')
        .set('x-auth-token', jwt)
        .send(project)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.have.property('msg').eql("Created new project and inserted into database.");
          done();
        });
      }) 
  });
  it('it should not create a new project if project name already used in user', (done) => {
    let registerUser = {
      "username": "regProjectNameFilled",
      "email": "regProjectNameFilled@gmail.com",
      "password": "regProjectNameFilled",
      "firstname": "regProjectNameFilled",
      "lastname": "regProjectNameFilled"
    }
    let project = {
        "title": "firstProject",
        "text": "first project!!!",
        "tags": [
          {
            "tag": "test"
          },
        ]
      }
    let new_project = {
        "title": "firstProject",
        "text": "different text but same title",
        "tags": [
          {
            "tag": "test"
          },
        ]
      }
  chai.request(app)
      .post('/users/signup')
      .send(registerUser)
      .end((err, res) => {
        res.should.have.status(200);
        let jwt = res.body.token;

        chai.request(app)
        .post('/projects/create')
        .set('x-auth-token', jwt)
        .send(project)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.have.property('msg').eql("Created new project and inserted into database.");

          chai.request(app)
          .post('/projects/create')
          .set('x-auth-token', jwt)
          .send(new_project)
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.have.property('msg').eql("There is already a project with that name belonging to the user.");
            done();
          })
        });
      }) 
  });
});
/*
  * Test the /POST route for deleting a project
  */
describe('/POST update project for /projects/delete/{title}', () => {
  it('it should successfully delete a specific project', (done) => {
    let registerUser = {
      "username": "regDeleteProject",
      "email": "regDeleteProject@gmail.com",
      "password": "regDeleteProject",
      "firstname": "regDeleteProject",
      "lastname": "regDeleteProject"
    }
    let project = {
        "title": "projectToDelete",
        "text": "first project!!!",
        "tags": [
          {
            "tag": "test"
          },
        ]
      }
  chai.request(app)
      .post('/users/signup')
      .send(registerUser)
      .end((err, res) => {
        res.should.have.status(200);
        let jwt = res.body.token;

        chai.request(app)
        .post('/projects/create')
        .set('x-auth-token', jwt)
        .send(project)
        .end((err, res) => {
          res.should.have.status(201);
          let title = project.title

          chai.request(app)
            .post('/projects/delete/'+title)
            .set('x-auth-token', jwt)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('msg').eql('Successfully deleted project.');
              done();
            });
        });
      }) 
  });
  it('it should not delete a specific project if project is not in user', (done) => {
    let registerUser = {
      "username": "regfailDeleteProject",
      "email": "regfailDeleteProject@gmail.com",
      "password": "regfailDeleteProject",
      "firstname": "regfailDeleteProject",
      "lastname": "regfailDeleteProject"
    }
    let project = {
        "title": "projectTofailDelete",
        "text": "first project!!!",
        "tags": [
          {
            "tag": "test"
          },
        ]
      }
  chai.request(app)
      .post('/users/signup')
      .send(registerUser)
      .end((err, res) => {
        res.should.have.status(200);
        let jwt = res.body.token;

        chai.request(app)
        .post('/projects/create')
        .set('x-auth-token', jwt)
        .send(project)
        .end((err, res) => {
          res.should.have.status(201);

          let incorrectTitle = 'incorrectProjectName'

          chai.request(app)
            .post('/projects/delete/'+incorrectTitle)
            .set('x-auth-token', jwt)
            .end((err, res) => {
              res.should.have.status(404);
              res.body.should.have.property('msg').eql('Could not find specified project-id for user.');
              done();
            });
        });
      }) 
  });
});
/*
  * Test the /GET route for getting all projects
  */
 describe('/GET users for /projects', () => {
  it('it should GET all the projects', (done) => {
    chai.request(app)
        .get('/projects')
        .end((err, res) => {
              res.should.have.status(200);
              res.body.should.be.a('array');
          done();
        });
  });
});
/*
  * Test the /GET route for getting all projects from a specific user
  */
 describe('/GET users for /projects/user', () => {
  it('it should get all the projects from a specific user', (done) => {
    let registerUser = {
      "username": "regGetAllUserProjects",
      "email": "regGetAllUserProjects@gmail.com",
      "password": "regGetAllUserProjects",
      "firstname": "regGetAllUserProjects",
      "lastname": "regGetAllUserProjects"
    }
    let project = {
        "title": "getProject",
        "text": "first project!!!",
        "tags": [
          {
            "tag": "test"
          },
        ]
      }
  chai.request(app)
      .post('/users/signup')
      .send(registerUser)
      .end((err, res) => {
        res.should.have.status(200);
        let jwt = res.body.token;

        chai.request(app)
        .post('/projects/create')
        .set('x-auth-token', jwt)
        .send(project)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.have.property('msg').eql("Created new project and inserted into database.");

          chai.request(app)
          .get('/projects/user')
          .set('x-auth-token', jwt)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('array');
            done();
            
          });          
        });
      }) 
  });
});

});
