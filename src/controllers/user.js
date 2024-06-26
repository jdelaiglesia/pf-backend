const User = require("../models/User");
const validateUser = require("../validations/validateUser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const getUsers = (req, res) => {
  User.find({ deleted: false })
    .then((result) => {
      const users = result.map((user) => {
        let userWithoutPassword = { ...user._doc };
        delete userWithoutPassword.password;
        return userWithoutPassword;
      });
      res.status(200).json(users);
    })
    .catch((error) => res.status(500).json({ message: error.message }));
};

const getUserByEmail = (req, res) => {
  const { email } = req.params;
  User.findOne({
    email: email,
    deleted: { $ne: true },
  })
    .then((data) => {
      const {
        _id,
        name,
        last_name,
        email,
        url_image,
        dni,
        address,
        age,
        rank,
        phone_number,
        is_member,
      } = data;
      userInfo = {
        _id,
        name,
        last_name,
        email,
        url_image,
        dni,
        address,
        age,
        rank,
        phone_number,
        is_member,
      };
      if (data) {
        res.status(200).json(userInfo);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    })
    .catch((error) => res.status(500).json({ message: error.message }));
};

const postUser = async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    let user = await User.findOne({
      email: req.body.email,
      deleted: { $ne: true },
    });
    if (user && !user.deleted) {
      return res
        .status(200)
        .json({ message: "User already exists", user: user });
    }

    const salt = await bcrypt.genSalt(10);
    let hashedPassword = "google123";
    hashedPassword = await bcrypt.hash(hashedPassword, salt);
    if (req.body.password !== undefined) {
      hashedPassword = await bcrypt.hash(req.body.password, salt);
    } else {
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }

    user = new User({
      name: req.body.name,
      last_name: req.body.last_name,
      email: req.body.email,
      url_image: req.body.url_image
        ? req.body.url_image
        : "https://cdn-icons-png.flaticon.com/512/8243/8243592.png",
      password: hashedPassword,
      dni: req.body?.dni,
      address: req.body?.address,
      age: req.body?.age,
      rank: req.body?.rank ? req.body.rank : 0,
      phone_number: req.body?.phone_number,
      is_member: req.body?.is_member ? true : false,
    });
    await user.save();
    return res
      .status(200)
      .json({ message: "Successfully registered user", user: user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const putUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { error } = validateUser(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });
    if (!userId) {
      return res.status(404).json({ message: "User ID is required" });
    }

    try {
      const user = await User.findById(userId);
      if (!user || user.deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      user.name = req.body.name;
      user.last_name = req.body.last_name;
      user.email = req.body.email;
      user.password = hashedPassword;
      user.dni = req.body.dni;
      user.address = req.body.address;
      user.age = req.body.age;
      user.rank = req.body.rank;
      user.phone_number = req.body.phone_number;
      user.is_member = req.body.is_member && is_member;

      await user.save();

      res.status(200).json({ message: "User successfully updated" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const putRank = async (req, res) => {
  try {
    const userId = req.params.id;
    const { rank } = req.body;

    const user = await User.findById(userId);
    if (!user || user.deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    user.rank = rank;
    await user.save();

    res.status(200).json({ message: "Rank modified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const putMember = async (req, res) => {
  try {
    const userId = req.params.id;
    const { member } = req.body;

    const user = await User.findById(userId);
    if (!user || user.deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    user.is_member = member;
    await user.save();

    res.status(200).json({ message: "Rank modified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user || user.deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    user.deleted = true;
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const userLogin = async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ message: "Incomplete information" });
  }

  try {
    let user = await User.findOne({
      email: req.body.email,
      deleted: { $ne: true },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    } else {
      const isMatch =
        (await bcrypt.compare(req.body.password, user.password)) ||
        req.body.password === user.password;

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      } else {
        const payloadUser = {
          id: user._id,
          name: user.name,
          email: user.email,
          rank: user.rank,
          is_member: user.is_member,
        };

        const token = jwt.sign(payloadUser, process.env.SECRET, {
          expiresIn: 60 * 60 * 300,
        });

        return res.status(200).json({
          user: {
            token,
            _id: user._id,
            name: user.name,
            last_name: user.last_name,
            email: user.email,
            url_image: user.url_image,
          },
          message: "Login succesfully",
        });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
const updateProfile = async (req, res) => {
  const { id } = req.params;
  const { name, last_name, dni, phone_number, url_image, address } = req.body;

  if (!id) return res.status(400).json({ message: "Invalid Credentials" });
  if (!name || !last_name || !dni || !phone_number || !url_image || !address)
    return res.status(400).json({ message: "Invalid Credentials" });

  try {
    const user = await User.findById(id);

    user.name = name;
    user.last_name = last_name;
    user.dni = dni;
    user.phone_number = phone_number;
    user.url_image = url_image;
    user.address = address;

    await user.save();

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Invalid credentials" });

  try {
    const user = await User.findOne({ email, deleted: { $ne: true } });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    } else {
      const isMatch =
        (await bcrypt.compare(req.body.password, user.password)) ||
        req.body.password === user.password;

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      } else {
        if (user.rank != 10)
          return res.status(401).json({ message: "Unauthorized" });

        const payloadUser = {
          id: user._id,
          name: user.name,
          email: user.email,
          rank: user.rank,
          is_member: user.is_member,
        };

        const token = jwt.sign(payloadUser, process.env.SECRET, {
          expiresIn: 60 * 60 * 300,
        });

        return res.status(200).json({
          user: {
            token,
            _id: user._id,
            name: user.name,
            last_name: user.last_name,
            email: user.email,
            url_image: user.url_image,
          },
          message: "Login succesfully",
        });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserByEmail,
  postUser,
  putUser,
  deleteUser,
  userLogin,
  putRank,
  putMember,
  updateProfile,
  adminLogin,
};
