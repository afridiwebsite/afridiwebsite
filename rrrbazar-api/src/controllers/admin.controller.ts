import axios from 'axios';
import express from 'express';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import Schema from '../models';
import { sequelize } from '../models/Schemas';
import responseUtils from '../utils/response.utils';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// import bcrypt from 'bcryptjs'

const {
  User,
  Order,
  AuthModule,
  Admin,
  AdminAuth,
  TopupPackagePermission,
  TopupPackage,
  Transaction,
  AdminTransaction,
  PaymentMethod,
  TopupProduct,
  TopupProductInput,
  WithdrawEarnWallet,
  EarnWallet,
  StoreUnipin,
  AutoServer,
  CoinTransaction
} = Schema;

// Reserved keyword for the Player ID input. Only one input per product is
// allowed to have this title; assigning it also auto-enables isactivefortopup.
const PLAYER_ID_TITLE = 'Player ID';
const isPlayerIdTitle = (t: any) =>
  String(t || '').trim().toLowerCase() === PLAYER_ID_TITLE.toLowerCase();
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class AdminController {
  async publishPermission(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    res.send(response.getResponse())
  }

  async getOrders(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const { user_id, order_id, status } = req.query;
      const filter: any = {};

      filter.payment_status = 1

      if (user_id) {
        filter.user_id = user_id
      }
      if (order_id) {
        filter.id = order_id
      }

      if (status) {
        filter.status = status
      }

      // Qualify with `Order` so MySQL doesn't see the joined Admin.status / id
      // and complain "Column 'status' in order clause is ambiguous".
      let order_by_str = sequelize.literal("CASE `Order`.`status` WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 WHEN 'Failed' THEN 3 WHEN 'cancel' THEN 4 END, `Order`.`created_at` desc, `Order`.`id` desc");
      if (status == 'cancel' || status == 'completed') {
        order_by_str = sequelize.literal('`Order`.`id` desc');
      }


      const limit: any = parseInt(req.query.limit?.toString() || '20')
      const page: any = parseInt(req.query.page?.toString() || '1')

      const orderCount = await Order.count({ where: filter })

      const orders = await Order.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: filter,
        order: order_by_str,
        include: [
          {
            model: Admin,
            attributes: ['first_name', 'last_name']
          }
        ]
      })


      response.data = { orders, order_count: orderCount };

      res.send(response.getResponse())
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }
  }

  async updateOrderStatus(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const order_id = (req.params.id as any);
    const admin = (req.admin as any);
    const statusToUpdate = req.body.status;
    const orderNote = req.body.order_note;
    const completedById = admin.id;
    const order = await Order.findByPk(order_id);

    if (!order) {
      response.message = 'Order not found';
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response)
    }

    if(order.status == 'in_progress' && order.completed_by && order.completed_by != req.admin.id) {
      response.message = `This admin cannot make action`;
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response)
    }

    if (!['pending'].includes(order.status)) {
      response.message = `Order is not available for edit`;
      response.status = 400;
      response.success = false;
      return res.status(400).send(response.response)
    }


    if (statusToUpdate == 'cancel') {
      let product = await TopupProduct.findByPk(order.product_id);
      let user = await User.findByPk(order.user_id);

      if (!user || !product) {
        response.message = `Something went wrong!`;
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response)
      }

      product.price = product.price + parseFloat((order as any).bprice)
      user.wallet = Number(user.wallet) + Number((order as any).amount)

      await product.save()
      await user.save()
    }

    order.status = statusToUpdate;
    order.brief_note = orderNote;
    order.completed_by = completedById;
    await order.save()

    response.message = 'Order updated successfully';
    response.data = order
    res.send(response.response)
  }

  async getAdminOrders(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const { user_id, status, order_id } = req.query;

      const adminId = req.admin.id;
      // const adminId = req.params.id;
      const filter: any = {};

      filter.payment_status = 1

      if (user_id) {
        filter.user_id = user_id
      }
      if (order_id) {
        filter.id = order_id
      }

      if (status) {
        filter.status = status
      }

      const limit: any = parseInt(req.query.limit?.toString() || '20')
      const page: any = parseInt(req.query.page?.toString() || '1')

      const packagesForAdmin = await TopupPackagePermission.findAll({
        where: {
          admin_id: adminId,
        },
        raw: true,
        attributes: ['topup_package_id'],
      })

      const bindPackageIdInArray = packagesForAdmin.map(pack => pack.topup_package_id.toString())

      if (bindPackageIdInArray.length <= 0) {
        response.message = 'No order found';
        response.status = 400;
        response.success = true;
        return res.status(400).send(response.response);
      }

      const orderCount = await Order.count({
        where: {
          topuppackage_id: bindPackageIdInArray,
          ...filter
        },
      })

      const getAdminOrdersByPackageId = await Order.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: {
          topuppackage_id: bindPackageIdInArray,
          ...filter
        },
        order: [
          ['created_at', 'DESC'],
        ],
        include: [
          {
            model: Admin,
            attributes: ['first_name', 'last_name']
          }
        ]
      })

      response.data = { orders: getAdminOrdersByPackageId, order_count: orderCount };
      res.send(response.response)
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }
  }

  async getAuthModules(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    // const limit: any = parseInt(req.query.limit?.toString() || '20')
    // const page: any = parseInt(req.query.page?.toString() || '1')

    // const auths = await AuthModule.findAll({
    //   offset: (page - 1) * limit,
    //   limit: limit,
    // })

    const auths = await AuthModule.findAll()

    response.data = auths;
    res.send(response.getResponse())
  }

  async activeAuthModules(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {
      const id = (req.params.id as any);

      const authModule = await AuthModule.findByPk(id)

      if (!authModule) {
        response.message = 'Auth module not found';
        response.status = 400;
        response.success = false
        return res.send(response.response);
      }

      if (authModule.status == 1) {
        response.status = 400;
        response.message = 'Auth module is already activated';
        response.success = false;
        return res.status(400).send(response.response);
      }

      authModule.name = req.body.name;
      authModule.description = req.body.description || '';
      authModule.slug = req.body.slug;
      authModule.description = req.body.description || '';
      authModule.status = 1;
      await authModule.save();

      res.send(response.response)
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }

  }

  async addAdminPermission(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const auths = await AuthModule.findByPk(req.body.auth_module_id)
      const admin = await Admin.findByPk(req.body.admin_id)
      if (!auths || !admin) {
        response.status = 400;
        response.message = 'Something went wrong';
        response.success = true
        return res.status(400).send(response.getResponse())
      }

      const existsPermission = await AdminAuth.findOne({
        where: {
          admin_id: req.body.admin_id,
          auth_module_id: req.body.auth_module_id
        }
      })

      if (existsPermission) {
        response.status = 400;
        response.message = 'Permission Already Applied';
        response.success = true
        return res.status(400).send(response.getResponse())
      }

      await AdminAuth.create({
        admin_id: req.body.admin_id,
        auth_module_id: req.body.auth_module_id
      })

      res.send(response.getResponse())
    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getAdminProfile = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const admin = await Admin.findByPk((req as any).admin.id);
      response.data = admin!;
      res.send(response.response);
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  updateAdminProfile = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const admin = await Admin.findByPk((req as any).admin.id);
      if (!admin) {
        response.message = 'Admin not found';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      const { first_name, last_name, email, phone, gender, date_of_birth, image } = req.body;

      if (first_name !== undefined) admin.first_name = first_name;
      if (last_name !== undefined) admin.last_name = last_name;
      if (email !== undefined) admin.email = email;
      if (phone !== undefined) admin.phone = phone;
      if (gender !== undefined) admin.gender = gender;
      if (date_of_birth !== undefined) admin.date_of_birth = date_of_birth;
      if (image !== undefined) admin.image = image;

      await admin.save();

      response.message = 'Profile updated successfully';
      response.data = admin;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

  async getAdmins(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const limit: any = parseInt(req.query.limit?.toString() || '20')
      const page: any = parseInt(req.query.page?.toString() || '1')

      const admins = await Admin.findAll({
        offset: (page - 1) * limit,
        limit: limit,
      })

      response.data = admins;
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async deleteAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      await Admin.destroy({
        where: {
          id
        }
      })

      response.message = 'Admin deleted.';
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async getAdminById(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {

      const admin = await Admin.findOne({
        where: {
          id,
        }
      })

      if (!admin) {
        response.message = 'Admin not found';
        response.success = false;
        response.status = 400;
        return res.status(400).send(response.response)
      }

      response.data = admin;
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async getAdminAuthById(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const adminId = (req.params.id as any)

      if (!adminId) throw new Error('Access Denied')
      const admin = await Admin.findByPk(adminId);

      if (!admin) {
        response.message = 'Admin not found';
        response.success = false;
        response.status = 400;
        return res.status(400).send(response.response)
      }

      const authsFromAdmin = await AdminAuth.findAll({
        where: {
          admin_id: adminId,
        },
        attributes: ['auth_module_id']
      })

      const authsOnlyArray = authsFromAdmin.map(ath => ath.auth_module_id)

      response.data = authsOnlyArray;
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async updateAdminAuth(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const adminId = req.body.admin_id;
      const authIds = req.body.auth_ids;

      await AdminAuth.destroy({
        where: {
          admin_id: adminId,
        }
      })

      if (authIds.length > 0) {
        for (let authId of authIds) {
          await AdminAuth.create({
            auth_module_id: authId,
            admin_id: adminId
          })
        }
      }

      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }


  getWithdrawEarnWallet = async (req: express.Request, res: express.Response) => {

    const response = new responseUtils()
    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery = {
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          user_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    try {
      const totalRow = await WithdrawEarnWallet.count({
        where: whereQuery
      })
      const requests = await WithdrawEarnWallet.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: whereQuery,
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions: requests, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async getAllTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery = {
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          user_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    try {
      const totalRow = await Transaction.count({
        where: whereQuery
      })
      const transactions = await Transaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        include: [
          {
            model: PaymentMethod
          },
          {
            model: Admin,
            attributes: ['first_name', 'last_name']
          }
        ],
        where: whereQuery,
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getMyTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery = {
      admin_id: req.admin.id,
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          admin_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    try {
      const totalRow = await AdminTransaction.count({
        where: whereQuery
      })
      const transactions = await AdminTransaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: whereQuery,
        include: {
          model: Admin
        },
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getAllAdminTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const whereQuery = {
      [Op.or]: [
        {
          number: { [Op.like]: `%${query}%` }
        },
        {
          admin_id: { [Op.like]: `%${query}%` }
        }
      ]
    };

    try {
      const totalRow = await AdminTransaction.count({
        where: whereQuery
      })
      const transactions = await AdminTransaction.findAll({
        offset: (page - 1) * limit,
        limit: limit,
        where: whereQuery,
        include: {
          model: Admin
        },
        order: [
          ['created_at', 'DESC'],
        ],
      })
      response.data = { transactions, total: totalRow };
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  getAdminTransactionById = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const id = (req.params.id as any);

    try {

      const transaction = await AdminTransaction.findByPk(id)

      if (!transaction) {
        response.message = 'Admin Transaction not found'
        return res.status(400).send(response.internalError)
      }

      response.data = transaction;
      res.send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async getTransactionById(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);

    try {

      const transaction = await Transaction.findByPk(id)

      if (!transaction) {
        response.message = 'Transaction not found'
        return res.status(400).send(response.internalError)
      }

      response.data = transaction;
      res.send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }


  adminWalletRequest = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {
      const {
        amount,
        number,
      } = req.body;

      let admin_id = req.admin.id

      const admin = await Admin.findByPk(admin_id);

      if(!admin) {
        response.message = 'Admin not found';
        response.success = false;
        return res.status(400).send(response.response)
      }

      if (amount < 0) {
        response.message = 'Please Refresh The Page And Send Again';
        return res.status(400).send(response.response)
      }

      if(admin.wallet < amount) {
        response.message = 'Enter a valid amount';
        response.success = false;
        return res.status(400).send(response.response)
      }

      const checkPendingOrder = await AdminTransaction.count({
        where: {
          admin_id,
          status: 'pending'
        }
      })


      if (checkPendingOrder > 0) {
        response.message = 'You Have Already A Pending Order. Please Completed To Add Another Order';
        return res.status(400).send(response.response)
      }

      const createTransaction = await AdminTransaction.create({
        admin_id,
        amount,
        number,
        status: 'pending'
      })

      admin.wallet = Number(admin.wallet) - Number(amount);
      admin.save();

      response.data = createTransaction;
      return res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  updateAdminTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const transactionId = parseInt(req.body.transaction_id);
      var status = req.body.status

      const transaction = await AdminTransaction.findByPk(transactionId);

      if (!transaction) {
        response.message = 'Admin Transaction not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      let admin = await Admin.findByPk(transaction.admin_id);

      if (!admin) {
        response.message = 'Admin Not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      if (status == 'cancel' && transaction.status == 'pending') {
        admin.wallet = Number(admin.wallet) + Number(transaction.amount)
        await admin.save();
      }

      transaction.status = status;
      await transaction.save();

      response.message = 'Transaction updated successfully'

      // await sleep(2000)
      res.send(response.response)
      
    } catch (error) {

      console.log(error);
      res.send(response.internalError);
      
    }

  }


  async updateTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const transactionId = parseInt(req.body.transaction_id);
    var status = req.body.status
    var old_status = req.body.old_status

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      response.message = 'Transaction not found'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    let user = await User.findByPk(transaction.user_id);

    if (!user) {
      response.message = 'User not found to update transaction'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    if (status == 'completed' && transaction.purpose == 'addwallet' && transaction.status == 'pending' && old_status != 'completed') {
      const admin = await Admin.findByPk(req.admin.id);
      if(admin) {
        admin.wallet = admin.wallet + transaction.amount;
        await admin.save();
      }
      user.wallet = Number(user.wallet) + Number(transaction.amount)
      await user.save();
    }

    transaction.status = status;
    transaction.action_by = req.admin.id;
    await transaction.save();

    response.message = 'Transaction updated successfully'

    // await sleep(2000)
    res.send(response.response)

  }

  updateAdminTransactionFullRow = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()

    try {

      const id = (req.params.id as any);
      const { amount, status, number } = req.body

      const transaction = await AdminTransaction.findByPk(id);

      if (!transaction) {
        response.message = 'Transaction not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      transaction.amount = Number(amount);
      transaction.number = number;
      if (transaction.status === 'cancel') transaction.status = status;
      await transaction.save()

      res.send(response.response)
      
    } catch (error) {
      console.log(error)
      res.send(response.internalError)
    }

  }

  async updateTransactionFullRow(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const id = (req.params.id as any);
    const { amount, status, number } = req.body

    const transaction = await Transaction.findByPk(id);

    if (!transaction) {
      response.message = 'Transaction not found'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    transaction.amount = Number(amount);
    transaction.number = number;
    if (transaction.status === 'cancel') transaction.status = status;
    await transaction.save()

    res.send(response.response)

  }

  async cancelAllTransaction(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {
      const totalCount = await Transaction.count({ where: { status: 'pending' } })
      await Transaction.update(
        {
          status: 'cancel'
        },
        {
          where: {
            status: 'pending'
          }
        })

      response.message = 'All pending transaction cancelled successfully';
      response.data = { total: totalCount }
      res.send(response.response)
    } catch (error) {
      console.log(error);
      response.message = 'Internal Error! Try again';
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response);
    }


    response.message = 'Transaction updated successfully'

    // await sleep(2000)
    res.send(response.response)

  }

  checkUsername = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    const username = req.params.username;
    const user = await Admin.findOne({
      where: {
        username,
      },
    });

    if (user) {
      response.message = 'Username already Exist'
      response.data = { status: 'NOT_AVAILABLE' }
    } else {
      response.data = { status: 'AVAILABLE' }
    }

    res.send(response.response)
  }

  updateWithdrawEarnWallet = async (req: express.Request, res: express.Response) => {

    const response = new responseUtils()

    try {

      const requestId = parseInt(req.body.withdraw_earn_wallet_id);
      var status = req.body.status
  

      const wewReq = await WithdrawEarnWallet.findByPk(requestId);

      if (!wewReq) {
        response.message = 'Request not found'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      

      let user = await User.findByPk(wewReq.user_id);

      if (!user) {
        response.message = 'User not found to update transaction'
        response.status = 400;
        response.success = false
        return res.status(400).send(response.response)
      }

      if(status === 'cancel') {

        let currentAmount = 0;

        const earnWallet = await EarnWallet.findOne({
          where: {
            user_id: user.id,
          },
          order: [
            ['id', 'DESC']
          ],
        })

        if(earnWallet) {
          currentAmount = earnWallet.total_amount;
        }

  
        await EarnWallet.create({
          user_id: user.id,
          amount: wewReq.amount,
          total_amount: currentAmount + wewReq.amount,
          purpose: 'Cancelling withdraw request',
        })
      }

      

      wewReq.status = status;
      await wewReq.save();

      response.message = 'Withdraw Request successfully'

      // await sleep(2000)
      res.send(response.response)
      
    } catch (error) {
      console.log(error)
      res.send(response.internalError) 
    }
  }

  async createNewAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const {
        first_name,
        last_name,
        username,
        gender,
        date_of_birth,
        email,
        phone,
        password
      } = req.body;

      const adminByEmail = await Admin.findOne({
        where: {
          email
        }
      })

      if (adminByEmail) {
        response.message = 'Email Already Exists';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response)
      }

      const adminByUsername = await Admin.findOne({
        where: {
          username
        }
      })

      if (adminByUsername) {
        response.message = 'Username Already Exists';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response)
      }

      const admin = new Admin();
      admin.first_name = first_name;
      admin.last_name = last_name;
      admin.username = username;
      admin.email = email;
      admin.password = password;

      if (gender) {
        admin.gender = gender;
      }

      if (phone) {
        admin.phone = phone;
      }

      await admin.save()
      response.message = 'Admin Created Success'
      res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async getDashboardStats(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const admin = (req.admin as any);
    const adminId = admin.id;
    const filter: any = {};

    try {
      const totalUser = await User.count()

      const TODAY_START = moment().startOf('day').toDate();
      const NOW = moment().endOf('day').toDate();
      const MONTH_START = moment().startOf('month').toDate();

      if (adminId != 1) {
        filter.completed_by = adminId
      }

      const todaysOrder = await Order.count({
        where: {
          payment_status: 1,
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const todaysCompletedOrder = await Order.count({
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const todaysUser = await User.count({
        where: {
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          }
        }
      })

      const totalWallet = await User.sum('wallet')

      const todaysTotalWallet = await Transaction.sum('amount', {
        where: {
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          }
        }
      })

      const todaysCompletedOrderBPrice = await Order.sum('bprice', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const todaysCompletedOrderAmount = await Order.sum('amount', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: TODAY_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const monthlyCompletedOrderBPrice = await Order.sum('bprice', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: MONTH_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const monthlyCompletedOrderAmount = await Order.sum('amount', {
        where: {
          payment_status: 1,
          status: 'completed',
          created_at: {
            [Op.gte]: MONTH_START,
            [Op.lte]: NOW
          },
          ...filter
        }
      })

      const uniAvaiCount = await StoreUnipin.findAll({
        attributes: ["package_id", [sequelize.fn('COUNT', 'id'), 'TotalAvailable']],
        where: {
          status: 1
        },
        group: ["package_id"]
      })

      response.data = {
        totalUser,
        todaysOrder,
        todaysCompletedOrderBPrice: Number(todaysCompletedOrderBPrice || 0),
        todaysCompletedOrderAmount: Number(todaysCompletedOrderAmount || 0),
        todaysProfileAmount: Number((todaysCompletedOrderAmount || 0) - (todaysCompletedOrderBPrice || 0)),
        monthlyCompletedOrderBPrice: Number(monthlyCompletedOrderBPrice || 0),
        monthlyCompletedOrderAmount: Number(monthlyCompletedOrderAmount || 0),
        monthlyProfitAmount: Number((monthlyCompletedOrderAmount || 0) - (monthlyCompletedOrderBPrice || 0)),
        todaysCompletedOrder,
        totalWallet: (adminId == 1) ? Number(totalWallet || 0) : 0,
        todaysTotalWallet: (adminId == 1) ? Number(todaysTotalWallet || 0) : 0,
        todaysUser,
        uniPin: uniAvaiCount
      }

      res.send(response.getResponse())

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async changePassword(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const { old_password, new_password, confirm_password } = req.body;
    try {
      const admin = await Admin.findByPk(req.admin.id)

      if (!admin) {
        response.message = 'Admin not found';
        return res.status(400).send(response.internalError)
      }

      if (new_password !== confirm_password) {
        response.message = 'New and confirm password not matched';
        return res.status(400).send(response.internalError)
      }

      const isVerified = await bcrypt.compare(old_password, admin.password);

      if (!isVerified) {
        response.message = 'Password not matched';
        return res.status(400).send(response.internalError)
      }
      admin.password = confirm_password
      await admin.save()

      response.message = 'Password changed'
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async orderCompletedByAdmin(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {
      const data = await sequelize.query(`Select admins.*, (select COUNT(orders.id) from orders where orders.completed_by = admins.id and orders.status = 'completed') as total_order, 
      (select COUNT(orders.id) from orders where orders.completed_by = admins.id and orders.status = 'completed' and DATE_FORMAT(orders.created_at, '%Y-%m-%d') = CURDATE()) as today_order from admins`, {
        type: QueryTypes.SELECT
      })

      response.data = data
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async getOrderChartData(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {

      const day = (day: number) => {
        return {
          where: {
            payment_status: 1,
            created_at: {
              [Op.gte]: moment().subtract(day, 'days').toDate(),
              [Op.lte]: moment().subtract(day - 1, 'days').toDate()
            }
          }
        }
      }

      const day_1 = await Order.count(day(1)) // return Today order count
      const day_2 = await Order.count(day(2)) // return yesterday order count
      const day_3 = await Order.count(day(3))
      const day_4 = await Order.count(day(4))
      const day_5 = await Order.count(day(5))
      const day_6 = await Order.count(day(6))
      const day_7 = await Order.count(day(7))

      response.data = {
        data: [
          day_7,
          day_6,
          day_5,
          day_4,
          day_3,
          day_2,
          day_1,
        ],
        dates: [
          moment().subtract(6, 'days').format('MM/DD/Y'),
          moment().subtract(5, 'days').format('MM/DD/Y'),
          moment().subtract(4, 'days').format('MM/DD/Y'),
          moment().subtract(3, 'days').format('MM/DD/Y'),
          moment().subtract(2, 'days').format('MM/DD/Y'),
          moment().subtract(1, 'days').format('MM/DD/Y'),
          moment().subtract(0, 'days').format('MM/DD/Y'),
        ]
      }
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }


  async getUsersForSendSms(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const limit: any = parseInt(req.query.limit?.toString() || '50')
    const page: any = parseInt(req.query.page?.toString() || '1')

    try {

      const users = await User.findAll({
        where: {
          phone: {
            [Op.ne]: '0'
          },
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [
          ['id', 'DESC']
        ]
      })

      response.data = users
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async sendSmsToUser(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    try {

      const { phones, message } = req.body
      res.end();

      for await (let phone of phones) {
        // const index = phones.indexOf(phone);
        await axios.get(`https://api.sms.net.bd/sendsms?api_key=${process.env.SMS_HASH_TOKEN}&msg=${message}&to=${phone}`).then(res => {
          console.log(res.data);
        }).catch(err => {
          console.log(err);
        })
      }

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async createUniPinData(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const {
        code,
        status,
        package_id
      } = req.body;

      const admin = (req.admin as any);

      const topupPackage = await TopupPackage.findByPk(package_id)

      if (!topupPackage) {
        response.message = 'Package Not Found';
        return res.status(404).send(response.response);
      }

      const code_list = code.split(/\r?\n/);

      for (let val of code_list) {
        await StoreUnipin.create({
          code: val.trim(),
          status: status,
          package_id: package_id,
          uc: topupPackage.uc,
          created_by: admin?.id
        })
      }

      response.message = 'Unipin Voucher Store Success'
      res.send(response.response)
    } catch (error) {
      //response.data = error
      res.status(400).send(response.internalError)
    }
  }

  async fetchUniPinData(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const filter: any = {};

    const query_user = req.query.user || ''
    const query_status = req.query.status || ''
    const query_package = req.query.package || ''
    const query_voucher = req.query.voucher || ''

    const limit: any = parseInt(req.query.limit?.toString() || '50')
    const page: any = parseInt(req.query.page?.toString() || '1')

    try {

      if (query_user) {
        filter.user_id = query_user
      }

      if (query_package) {
        filter.package_id = query_package
      }

      if (query_status) {
        filter.status = query_status
      }

      if (query_voucher) {
        filter.code = query_voucher
      }

      const voucherCount = await StoreUnipin.count({
        where: {
          ...filter
        }
      })

      const sups = await StoreUnipin.findAll({
        where: {
          ...filter
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [
          ['id', 'DESC']
        ]
      })

      response.data = {vouchers: sups, voucher_count: voucherCount}
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async deleteUniPin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      await StoreUnipin.destroy({
        where: {
          id
        }
      })

      response.message = 'Voucher deleted.';
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async updateUniPin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      const status = req.body.status;
      const package_id = req.body.package_id;

      const admin = (req.admin as any);

      const topupPackage = await TopupPackage.findByPk(package_id)

      if (!topupPackage) {
        response.message = 'Package Not Found';
        return res.status(404).send(response.response);
      }

      const upin = await StoreUnipin.findByPk(id);
      if (!upin) {
        response.message = 'Voucher not found';
        return res.status(400).send(response.internalError)
      }

      upin.status = status;
      upin.package_id = package_id;
      upin.uc = topupPackage.uc;
      upin.updated_by = admin?.id;
      await upin.save();

      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async fetchUniPin(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {

      const upin = await StoreUnipin.findByPk(id);
      if (!upin) {
        response.message = 'Voucher not found';
        return res.status(400).send(response.internalError)
      }
      response.data = upin;

      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async createBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    try {
      const {
        name,
        ip_url,
        status
      } = req.body;

      const admin = (req.admin as any);

      const autoBotServer = await AutoServer.findByPk(ip_url)

      if (!autoBotServer) {
        await AutoServer.create({
          name: name,
          ip_url: ip_url,
          status: status,
          created_by: admin?.id
        })
      } else {
        response.message = 'Already Exist This Server';
        return res.status(404).send(response.response);
      }

      response.message = 'Bot Server Store Success'
      res.send(response.response)
    } catch (error) {
      //response.data = error
      res.status(400).send(response.internalError)
    }
  }

  async fetchBotServerData(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const filter: any = {};

    const query_name = req.query.name || ''
    const query_ip_url = req.query.ip_url || ''
    const query_status = req.query.status || ''

    const limit: any = parseInt(req.query.limit?.toString() || '50')
    const page: any = parseInt(req.query.page?.toString() || '1')

    try {

      if (query_name) {
        filter.name = query_name
      }

      if (query_ip_url) {
        filter.ip_url = query_ip_url
      }

      if (query_status) {
        filter.status = query_status
      }

      const sups = await AutoServer.findAll({
        where: {
          ...filter
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [
          ['id', 'DESC']
        ]
      })

      response.data = sups
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async deleteBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      await AutoServer.destroy({
        where: {
          id
        }
      })

      response.message = 'Bot Server deleted.';
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async updateBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {
      const name = req.body.name;
      const ip_url = req.body.ip_url;
      const status = req.body.status;

      const admin = (req.admin as any);

      const bot_server = await AutoServer.findByPk(id)

      if (!bot_server) {
        response.message = 'Bot Server Not Found';
        return res.status(404).send(response.response);
      }

      bot_server.status = status;
      bot_server.ip_url = ip_url;
      bot_server.name = name;
      bot_server.total_order = 0;
      await bot_server.save();

      res.status(200).send(response.response);

    } catch (error) {
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async fetchBotServer(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const id = (req.params.id as any);
    try {

      const bot_server = await AutoServer.findByPk(id);
      if (!bot_server) {
        response.message = 'Bot Server not found';
        return res.status(400).send(response.internalError)
      }
      response.data = bot_server;

      res.status(200).send(response.response);

    } catch (error) {
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  async getUCBalanceSheet(req: express.Request, res: express.Response) {
    const response = new responseUtils()
    const package_id = req.params.package_id
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const today = currentDate.getDate();
      const firstDayOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;

      const openingBalance = await StoreUnipin.findAll({
        attributes: [
          'package_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'opening_balance']
        ],
        where: {
          created_at: { [Op.lt]: `${firstDayOfMonth} 00:00:00` },
          updated_at: { [Op.gt]: sequelize.literal(`TO_SECONDS("${firstDayOfMonth} 00:00:00")`) },
          package_id: package_id
        },
        group: ['package_id']
      });

      if (!openingBalance) {
        response.message = 'NOT FOUND DATA';
        //response.success = false;
        //response.status = 400;
        //return res.status(400).send(response.response)
      }


      const credit_balance = await StoreUnipin.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%d-%m-%Y'), 'uc_date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'added']
        ],
        where: {
          [Op.and]: [
            sequelize.where(sequelize.fn('MONTH', sequelize.col('created_at')), month),
            { topuppackage_id: package_id }
          ]
        },
        group: [sequelize.col('uc_date')],
        order: [[sequelize.col('uc_date'), 'ASC']]
      });
      
      if (!credit_balance) {
        response.message = 'NOT FOUND DATA credit_balance';
        //response.success = false;
        //response.status = 400;
        //return res.status(400).send(response.response)
      }

      const debit_balance = await Order.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%d-%m-%Y'), 'or_date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'uc_used']
        ],
        where: {
          [Op.and]: [
            sequelize.where(sequelize.fn('MONTH', sequelize.col('created_at')), month),
            { topuppackage_id: package_id }
          ]
        },
        group: [sequelize.col('or_date')],
        order: [[sequelize.col('or_date'), 'ASC']]
      });
      
      if (!credit_balance) {
        response.message = 'NOT FOUND DATA debit_balance';
        //response.success = false;
        //response.status = 400;
        //return res.status(400).send(response.response)
      }

      response.data = {openingBalance, credit_balance, debit_balance};
      res.status(200).send(response.response);

    } catch (error) {
      console.log(error)
      response.status = 400;
      response.message = 'Internal error! Try again';
      response.success = true
      return res.status(400).send(response.getResponse())
    }
  }

  // Replace the dynamic input definitions for a topup product. The admin form
  // posts the full desired list — this destroys old rows and inserts new ones.
  //
  // Rules:
  //  - Title "Player ID" is reserved. At most one input per product may use it.
  //  - When a Player ID input exists, the parent product's isactivefortopup is
  //    forced to 1 (the legacy flag that drove the simple Player-ID-only UX).
  //  - verify_url is only stored when verify_player_name is checked.
  assignProductInputs = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils()
    try {
      const product_id = Number((req.params.id as any))
      const rawInputs: any[] = Array.isArray(req.body.inputs) ? req.body.inputs : []

      const product = await TopupProduct.findByPk(product_id)
      if (!product) {
        response.message = 'TopupProduct not found'
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      // Normalize, drop empties (title is required), and tag is_player_id.
      const cleaned = rawInputs
        .map((it: any, idx: number) => {
          const title = String(it?.title || '').trim()
          if (!title) return null
          const playerIdMatch = isPlayerIdTitle(title)
          const verify = playerIdMatch && it?.verify_player_name ? 1 : 0
          return {
            topup_product_id: product_id,
            title: playerIdMatch ? PLAYER_ID_TITLE : title, // normalize casing
            is_player_id: playerIdMatch ? 1 : 0,
            verify_player_name: verify,
            verify_url: verify ? String(it?.verify_url || '').trim() : '',
            api_token: verify ? String(it?.api_token || '').trim() : '',
            region_lock: verify ? String(it?.region_lock || '').trim().toUpperCase() : '',
            serial: typeof it?.serial === 'number' ? it.serial : idx,
          }
        })
        .filter(Boolean) as any[]

      // Enforce: at most one Player ID input.
      const playerIdCount = cleaned.filter((it) => it.is_player_id === 1).length
      if (playerIdCount > 1) {
        response.message = `Only one input can use the reserved title "${PLAYER_ID_TITLE}"`
        response.status = 400
        response.success = false
        return res.status(400).send(response.response)
      }

      await TopupProductInput.destroy({ where: { topup_product_id: product_id } })
      if (cleaned.length) {
        await TopupProductInput.bulkCreate(cleaned)
      }

      // If the product now has a Player ID input, force isactivefortopup = 1.
      // (We don't auto-unset it when the input is removed — that's a separate
      // explicit choice the admin can make in the product form.)
      if (playerIdCount === 1 && product.isactivefortopup !== 1) {
        product.isactivefortopup = 1
        await product.save()
      }

      response.data = { count: cleaned.length }
      res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  updateUser = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const id = req.params.id as any;
      const { wallet, coins, password } = req.body;
      const user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found';
        response.status = 400;
        response.success = false;
        return res.status(400).send(response.response);
      }

      const admin = (req as any).admin;

      // Handle wallet update and transaction
      if (wallet !== undefined && Number(wallet) !== Number(user.wallet)) {
        const diff = Number(wallet) - Number(user.wallet);
        await Transaction.create({
          user_id: user.id,
          amount: Math.abs(diff),
          status: 'completed',
          purpose: diff > 0 ? 'Admin Credit' : 'Admin Debit',
          action_by: admin.id,
        });
        user.wallet = Number(wallet);
      }

      // Handle coins update and transaction
      if (coins !== undefined && Number(coins) !== Number(user.coins)) {
        const diff = Number(coins) - Number(user.coins);
        await CoinTransaction.create({
          user_id: user.id,
          amount: Math.abs(diff),
          type: diff > 0 ? 'Admin Credit' : 'Admin Debit',
          note: `Adjusted by Admin: ${admin.username}`,
        });
        user.coins = Number(coins);
      }

      if (password) {
        user.password = password;
      }

      await user.save();

      response.message = 'User updated successfully';
      response.data = user;
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  }

}



/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new AdminController();

