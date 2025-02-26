const express = require("express");
const User = require("../../models/users.model");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();
const gravatar = require("gravatar");
const multer = require("multer");
const path = require("path");
const jimp = require("jimp");
const nodemailer = require("nodemailer");
const { nanoid } = require("nanoid");

function generateVerificationToken() {
  return nanoid();
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "tmp");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = uniqueSuffix + "-" + file.originalname;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
});

const auth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (!user || err) {
      return res.status(401).json({
        status: "error",
        code: 401,
        message: "Unauthorized",
        data: "Unauthorized",
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

router.post("/signup", upload.single("avatar"), async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    res.json({
      status: "error",
      code: 409,
      data: `Conflict`,
      message: "User already exists!",
    });
  }
  try {
    const avatarURL = req.file
      ? `/avatars/${req.file.filename}`
      : gravatar.url(email, {
          s: "250",
          r: "pg",
          d: "mm",
        });
    const verificationToken = generateVerificationToken();
    const newUser = new User({
      email,
      avatarURL,
      verificationToken,
      verify: false,
    });
    newUser.setPassword(password);

    await newUser.save();
    const transporter = nodemailer.createTransport({
      service: "outlook",
      secure: false,
      auth: {
        user: "szpnfaceit@outlook.com",
        pass: "qwerty1234%",
      },
    });
    const html = `<a href='http://localhost:3000/api/users/verify/${newUser.verificationToken}'>Confirm email</a>`;
    const emailOptions = {
      from: "szpnfaceit@outlook.com",
      to: newUser.email,
      subject: "Varify email",
      html: html,
    };

    await transporter.sendMail(emailOptions, function (err, info) {
      if (err) {
        console.log(err);
        return;
      }
    });
    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
});
router.post("/login", async (req, res, _) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.validPassword(password)) {
    return res.json({
      status: "error",
      code: 400,
      data: "Incorrect login/password",
      message: "User already exists!",
    });
  }

  const isVerified = user.verify;

  if (!isVerified) {
    res.status(401).json({ message: "Email is not verified" });
    return;
  }

  const payload = {
    id: user._id,
  };
  const secret = "testsecret";
  const token = jwt.sign(payload, secret);

  user.token = token;
  await user.save();

  return res.json({
    status: "success",
    code: 200,
    data: {
      token,
    },
  });
});

router.get("/logout", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    user.token = null;
    await user.save();

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get("/current", auth, async (req, res, _) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.json({
        status: "error",
        code: 401,
        data: {
          message: "Not authorized",
        },
      });
    }
    res.json({
      status: "success",
      code: 200,
      data: {
        users: user || [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/avatars", auth, upload.single("avatar"), async (req, res, _) => {
  try {
    const user = await User.findById(req.user._id);
    const avatarPath = req.file.path;
    const avatarsFolder = path.resolve(__dirname, "../../public/avatars");
    console.log(avatarsFolder);
    if (!user) {
      return res.json({
        status: "error",
        code: 401,
        data: {
          message: "Not authorized",
        },
      });
    }

    const image = await jimp.read(avatarPath);
    image
      .resize(250, 250)
      .write(path.resolve(avatarsFolder, req.file.filename));

    const avatarUrl = `/avatars/${req.file.filename}`;
    user.avatarURL = avatarUrl;
    await user.save();
    res.status(200).json({
      avatarUrl: user.avatarURL,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/verify/:verificationToken", async (req, res, next) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.verificationToken,
    });

    if (!user) {
      return res.json({
        status: "error",
        code: 404,
        data: {
          message: "User not found",
        },
      });
    }
    user.verify = true;
    user.verificationToken = "null";
    await user.save();

    return res.status(200).json({ message: "Verification successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const email = req.email;
    const user = await User.findOne({ email });
    if (!email) {
      return res.json({
        status: error,
        code: 400,
        data: {
          message: "missing required field email",
        },
      });
    }
    if (!user) {
      return res.json({
        status: error,
        code: 404,
        data: {
          message: "User not found",
        },
      });
    }

    if (user.verify) {
      return res.json({
        status: error,
        code: 400,
        data: {
          message: "Verification has already been passed",
        },
      });
    }
    const transporter = nodemailer.createTransport({
      service: "outlook",
      secure: false,
      auth: {
        user: "szpnfaceit@outlook.com",
        pass: "qwerty1234%",
      },
    });
    const html = `<p>Click on the link below to verify your account</p>
    <a href='http://localhost:3000/api/users/verify/${user.verificationToken}'>VERIFY</a>`;
    const emailOptions = {
      from: "szpnfaceit@outlook.com",
      to: email,
      subject: "Veryfication",
      text: "Mail verification link",
      html: html,
    };

    await transporter.sendMail(emailOptions);
    res.status(200).json({ message: "Verification email sent" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
