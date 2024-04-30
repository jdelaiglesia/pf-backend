const Sale = require("../models/Sale");
const User = require("../models/User");
const Product = require("../models/Product");
const todayDate = new Date();

const getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find({ deleted: false }).populate('user').populate({
      path: 'products._id',
      model: 'product'
  })
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findOne({ _id: id, deleted: { $ne: true } });
    if (sale) {
      res.status(200).json(sale);
    } else {
      res.status(404).json({ message: "Sale not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createSale = async (req, res) => {
  try {
    const { products, user } = req.body;
    let total = 0;
    for (let i = 0; i < products.length; i++) {
      const product = await Product.findOne({
        _id: products[i]._id,
        deleted: { $ne: true },
      });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      total += product.price * products[i].quantity;
    }
    const sale = new Sale({ date: todayDate, total, products, user });
    const userExists = await User.findOne({
      _id: user,
      deleted: { $ne: true },
    });
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }
    await sale.save();
    res.status(201).json({ message: "Sale created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const completeSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findOne({ _id: id, deleted: { $ne: true } });
    if (sale) {
      sale.status = "completed";
      const products = sale.products;
      for (let i = 0; i < products.length; i++) {
        const product = await Product.findOne({
          _id: products[i]._id,
          deleted: { $ne: true },
        });
        product.stock -= products[i].quantity;
        await product.save();
      }
      await sale.save();
      res.status(200).json({ message: "Sale completed successfully" });
    } else {
      res.status(404).json({ message: "Sale not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findOne({ _id: id, deleted: { $ne: true } });
    if (sale) {
      sale.deleted = true;
      await sale.save();
      res.status(200).json({ message: "Sale deleted successfully" });
    } else {
      res.status(404).json({ message: "Sale not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllSales,
  getSale,
  createSale,
  completeSale,
  deleteSale,
};
