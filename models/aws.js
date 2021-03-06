require('dotenv').config();
const fs = require('fs');
const AWS = require('aws-sdk');
const multer = require("multer");
const multerS3 = require("multer-s3");

// update the AWS config
AWS.config = new AWS.Config();
AWS.config.accessKeyId = process.env.AWS_ACCESS_KEY;
AWS.config.secretAccessKey = process.env.AWS_SECRET_KEY;
AWS.config.region = 'ap-southeast-2';


// These next methods seem to be more 'modern' ways of setting the config but I can't get them to work

// const SESConfig = {
//     accessKeyId: process.env.AWS_ACCESS_KEY,
//     accessSecretKey: process.env.AWS_SECRET_KEY,
//     region: 'ap-southeast-2'
// }
// AWS.config.update(SESConfig);

// const s3 = new AWS.S3({
//     accessKeyID: process.env.AWS_ACCESS_KEY,
//     secretAccessKey: process.env.AWS_SECRET_KEY,
//     region: 'ap-southeast-2'
// });

const s3 = new AWS.S3();


/* 
 * Multer middleware to upload a document to AWS-S3. The standard upload function
 *
 * I believe the client MUST match the route call of `uploadMulter.single('userFile')` with something like:
 * var theinput = document.getElementById('myfileinput')
 * var data = new FormData()
 * data.append('myfile',theinput.files[0])
 * fetch( "/upload", { method:"POST", body:data } )
 * https://stackoverflow.com/questions/31530200/node-multer-unexpected-field
 *
 * username comes via auth of JWT
 * projectid is via the parameters of the route
 */
const uploadFile = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET,
        key: function (req, file, cb){
            var filekey = getFolderKey(req.user.username, req.params.projectid) + encodeURIComponent(file.originalname);
            cb(null, filekey);
        },
        contentType: function (req, file, cb) {
            cb(null, getContentType(file.originalname));
        },
        contentDisposition: "inline",
        acl: 'public-read'
   }) 
});


/* 
 * upload profile picture for the user.
 * Because of the way the multer middleware works, I don't know how to have the 
 * req object reflect if it's doing dp or file, so this function is almost 
 * identical to uploadFile
 */
const uploadDP = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET,
        key: function (req, file, cb){
            var filekey = req.user.username + '/dp';
            cb(null, filekey);
        },
        contentType: function (req, file, cb) {
            cb(null, getContentType(file.originalname));
        },
        contentDisposition: "inline",
        acl: 'public-read'
   }) 
});



/* 
 * delete a file given by url from AWS S3
 *
 * callback has 1 argument (err) that will contain the AWS error message
*/
const deleteFile = async (fileurl, callback) => {

    if (!fileurl) {
        callback({err: "file does not exist"});
        return;
    }

    // get the filekey from the input url
    // url should be starter2 beased on all documentation, but the actual files are on starter1??
    var starter1 = "https://circlespace-uploads.s3-ap-southeast-2.amazonaws.com/";
    var starter2 = "https://circlespace-uploads.s3.ap-southeast-2.amazonaws.com/";
    var fileKey = fileurl.replace(starter1, '');
    var fileKey = fileKey.replace(starter2, '');

    s3.deleteObject({ Key: decodeURIComponent(fileKey), Bucket: process.env.AWS_BUCKET }, function (err, data) {
        if (err) {
            callback(err.message);
        } else {
            callback(null);
        }
    });
};

/*
 * convert a username and projectname into a valid string to act as a foldername, and adds a '/'
 * folder scheme follows "/username/projectname/file"
 */
function getFolderKey(username = undefined, projectname = undefined) {
    if (username === undefined || projectname === undefined) {
        var folderKey = "tests/";
    } else {
        var folderKey = encodeURIComponent(username) + "/" + encodeURIComponent(projectname) + "/";
    }
    return folderKey;
}

/*
 * Parse the extension of a file into one of the S3 metadata options.
 * An extension that doesn't match returns "binary/octet", the default
 */
const getContentType = (filename) => {
    extensions = [
        {"ext": "pdf",  "type": "application/pdf"},
        {"ext": "doc",  "type": "application/msword"},
        {"ext": "docx", "type": "application/msword"},
        {"ext": "jpeg", "type": "image/jpg"},
        {"ext": "png",  "type": "image/png"},
        {"ext": "gif",  "type": "image/gif"},
        {"ext": "tiff", "type": "image/tiff"},
        {"ext": "txt",  "type": "text/plain"},
        {"ext": "rtf",  "type": "text/rtf"}
    ]
    // courtesy: https://stackoverflow.com/a/12900504
    var extension = filename.slice((Math.max(0, filename.lastIndexOf(".")) || Infinity) + 1);
    var found = extensions.find(elem => elem.ext === extension);
    if (found)
        return found.type;
    else     // unsupported file type
        return "application/octet-stream";
        return "binary/octet";
}


/* * * * DEPRECATED FUNCTIONS * * * */

/* 
 * @deprecated
 * upload a file to AWS S3, given by the filename of the local file on disk.
 *
 * callback has 2 arguments (err, url)
 *     - err is null or contains the AWS error message
 *     - url wil hold the URL that the file was uploaded to
*/
const uploadFileLocal = async (filename, username, projectname, callback) => {
    fs.readFile(filename, (err, data) => {
        if (err) {
            callback(err, undefined);
        }

        var fileKey = getFolderKey(username, projectname) + encodeURIComponent(filename);

        const params = {
            Bucket: process.env.AWS_BUCKET,
            Key: fileKey,
            Body: data,
            ContentType: getContentType(filename),  // this won't work if we are passing in the file as data??
            // inline type lets file be displayed in-browser
            ContentDisposition: "inline",
            // content type to force later download: http://iwantmyreal.name/s3-download-only-presigned-upload
            // ContentDisposition: "attachment; filename=\"" + filename + "\"",
            ACL: 'public-read'
        };
        // s3.upload(params, function (s3Err, data) {
        //     if (s3Err) throw s3Err
        //     console.log(`File uploaded successfully at ${data.Location}`);
        // });

        var upload = new AWS.S3.ManagedUpload({params}).promise()
        .then(
            function (data) {
                // console.log(`Successfully uploaded file: ${data.Location}`);
                callback(null, data.Location);
            },
            function (err) {
                // console.log("Error uploading file: " + err.message);
                callback(err.message, undefined);
                return
            }
        );
    });
};

/* 
 * @deprecated: unnecessary with multer
 * generate the url that a file will be saved to based on its fileKey
 */
function getFileURL(fileKey) {
    return "https://" + process.env.AWS_BUCKET + ".s3." + process.env.AWS_REGION + ".amazonaws.com/" + fileKey
}

/*
 * @deprectated: unnecessary
 * creates a folder on AWS S3
 * This could either be used to create folders for individual users, or for 
 * users to be able to create their own folders (or both)
*/
function createFolder(folderName) {
    folderName = folderName.trim();
    if (!folderName) {
        console.log("Folder names must contain at least one non-space character.");
        return
    }
    if (folderName.includes('/')) {
        console.log("Folder names cannot contain slashes.");
        return
    }

    // here we don't use getFolderKey as that adds a '/'
    var folderKey = encodeURIComponent(folderName);

    s3.headObject({ Key: folderKey, Bucket: process.env.AWS_BUCKET }, function (err, data) {
        if (!err) {
            console.log("Folder already exists.");
            return
        }
        if (err.code !== "NotFound") {
            console.log("There was an error creating folder: " + err.message);
            return
        }
        s3.putObject({ Key: folderKey, Bucket: process.env.AWS_BUCKET }, function (err, data) {
            if (err) {
                console.log("There was an error creating folder: " + err.message);
                return
            }
            console.log("Successfully created folder: " + folderKey);
        });
    });
}

module.exports = {
    uploadFile,
    uploadDP,
    deleteFile,
    getContentType,
    uploadFileLocal,
}
