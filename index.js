var f4js = require("fuse4js");
var fs = require("fs");
var path = require("path");

var srcroot = process.argv[2];
var imagename = "img";
var mountpoint = process.argv[3];
console.log(srcroot, mountpoint);

// var blocksize = 1024 * 1024;
var blocksize = 4096;

var errnoMap = {
  EPERM: 1,
  ENOENT: 2,
  EACCES: 13,
  EINVAL: 22,
  ENOTEMPTY: 39
};

function excToErrno(exc) {
  var errno = errnoMap[exc.code];
  if (!errno) errno = errnoMap.EPERM;
  return errno;
}

function unsupported(path, callback) {
  callback(-errnoMap.EINVAL);
}

var readlink, chmod, create, unlink, rename, mkdir, rmdir;
chmod, create, unlink, rename, mkdir, rmdir = unsupported;

function getattr(path, callback) {
  console.log("getattr");
  if (path === "/") {
    callback(0, { size: 4096, mode: 040777, nlink: 1 });
  } else if (path === "/" + imagename) {
    callback(0, {
      size: fs.readdirSync(srcroot).length * blocksize,
      mode: 0100777,
      nlink: 1
    });
  } else {
    callback(-errnoMap.ENOENT);
  }
}

function readdir(path, callback) {
  console.log("readdir");
  if (path !== "/") return callback(errnoMap.EINVAL);
  return callback(0, [imagename]);
}

function open(path, flags, callback) {
  console.log("open");
  if (path !== "/" + imagename) return callback(errnoMap.ENOENT);
  return callback(0);
}

function read(pth, offset, len, buf, _, callback) {
  if (pth !== "/" + imagename) return callback(errnoMap.ENOENT);
  var blockid = Math.floor(offset / blocksize);
  var bufoffset = 0;
  offset %= blocksize;
  (function recur(blockid, len, bufoffset, offset) {
    if (len <= 0) {
      console.log("done");
      callback(bufoffset);
      return;
    }
    var readlength = Math.min(len, blocksize);
    fs.open(path.join(srcroot, ""+blockid), "r", function (err, fd) {
      if (err) {
        callback(bufoffset);
        return;
      }
      fs.read(fd, buf, bufoffset, readlength, offset, function (err) {
        fs.close(fd, function () {
          console.log(blockid);
          // process.stdout.write(buf.slice(bufoffset, bufoffset + readlength), "utf8");
          if (err) {
            callback(bufoffset);
            return;
          }
          recur(blockid + 1, len - readlength, bufoffset + readlength, 0);
        });
      });
    });
  }(blockid, len, bufoffset, offset));
  // if (pth !== "/" + imagename) return callback(errnoMap.ENOENT);
  // console.log("read");
  // for (var i = 0; i < len; i++) buf[i] = "@".charCodeAt(0);
  // callback(len);
  // var blockid = Math.floor(offset / blocksize);
  // var bufoffset = 0;
  // offset %= blocksize;
  // while (len > 0) {
  //   console.log(blockid);
  //   var readlen = Math.min(len, blocksize);
  //   try {
  //     var fd = fs.openSync(path.join(srcroot, ""+blockid), "r");
  //     fs.readSync(fd, buf, bufoffset, readlen, offset);
  //     fs.closeSync(fd);
  //   } catch (e) {
  //     callback(bufoffset);
  //     return;
  //   }
  //   // process.stdout.write(buf.slice(bufoffset, bufoffset+readlen), "utf8");
  //   len -= readlen;
  //   blockid++;
  //   offset = 0;
  //   bufoffset += readlen;
  // }
  // callback(bufoffset);
}

function write(path, offset, len, buf, _, callback) {
  console.log("write");
  if (pth !== "/" + imagename) return callback(errnoMap.ENOENT);
  var blockid = Math.floor(offset / blocksize);
  var bufoffset = 0;
  offset %= blocksize;
  (function recur(blockid, len, bufoffset, offset) {
    if (len <= 0) {
      console.log("done");
      callback(bufoffset);
      return;
    }
    var readlength = Math.min(len, blocksize);
    fs.open(path.join(srcroot, ""+blockid), "r+", function (err, fd) {
      if (err) {
        callback(bufoffset);
        return;
      }
      fs.write(fd, buf, bufoffset, readlength, offset, function (err) {
        fs.close(fd, function () {
          console.log(blockid);
          // process.stdout.write(buf.slice(bufoffset, bufoffset + readlength), "utf8");
          if (err) {
            callback(bufoffset);
            return;
          }
          recur(blockid + 1, len - readlength, bufoffset + readlength, 0);
        });
      });
    });
  }(blockid, len, bufoffset, offset));
}

function release(_1, _2, callback) {
  callback(0);
}

function init(callback) {
  console.log("init");
  callback(0);
}

function destroy(callback) {
  console.log("destroy");
  callback(0);
}

function statfs(cb) {
  cb(0, {
    bsize: 1000000,
    frsize: 1000000,
    blocks: 1000000,
    bfree: 1000000,
    bavail: 1000000,
    files: 1000000,
    ffree: 1000000,
    favail: 1000000,
    fsid: 1000000,
    flag: 1000000,
    namemax: 1000000
  });
}

var handlers = {
  getattr: getattr,
  readdir: readdir,
  readlink: readlink,
  chmod: chmod,
  open: open,
  read: read,
  write: write,
  release: release,
  create: create,
  unlink: unlink,
  rename: rename,
  mkdir: mkdir,
  rmdir: rmdir,
  init: init,
  destroy: destroy,
  statfs: statfs
};

(function main() {
  f4js.start(mountpoint, handlers, false);
}());
