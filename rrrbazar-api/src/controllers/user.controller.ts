import crypto from 'crypto';
import express, { NextFunction } from 'express';
import createError from 'http-errors';
import { Op, Sequelize } from "sequelize";
import Schema from '../models';
import responseUtils from '../utils/response.utils';
// import smsHelper from '../helpers/sms';
const smsHelper = require('../helpers/sms')
const fastPay = require('../helpers/fastpay')
const autoOrder = require('../helpers/autoorder')
const playerName = require('../helpers/playername')
const {
  User,
  Banner,
  Notice,
  Admin,
  TopupProduct,
  Product,
  TopupPackage,
  PaymentMethod,
  Transaction,
  ProductOrder,
  Order,
  Otp,
  PasswordReset,
  TopupPaymentMethod,
  Inventorie,
  EarnWallet,
  WithdrawEarnWallet,
  StoreUnipin,
  AutoServer,
  CoinTransaction,
  SiteSetting
} = Schema;
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class UserController {

  async getUsers(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const query = req.query.q || ''

    const limit: any = parseInt(req.query.limit?.toString() || '20')
    const page: any = parseInt(req.query.page?.toString() || '1')

    const user_count = await User.count()

    const data = await User.findAll({
      offset: (page - 1) * limit,
      limit: limit,
      where: {
        [Op.or]: [
          {
            email: { [Op.like]: `%${query}%` }
          },
          {
            phone: { [Op.like]: `%${query}%` }
          },
          {
            id: { [Op.like]: `%${query}%` }
          }
        ]
      },
      // order: [
      //   ['created_at', 'DESC'],
      // ],
    })
    response.data = { data, user_count, }
    res.send(response.response)
  }

  async updateUser(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const id = (req.params.id as any)
    const { phone,
      wallet,
      address,
      city,
      zip_code,
      password } = req.body

    console.log(req.body);

    const user = await User.findByPk(id)

    if (!user) {
      response.message = 'User not found to update'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    if (phone) { user.phone = phone; }
    if (wallet) { user.wallet = wallet };
    user.address = address;
    user.city = city;
    user.zip_code = zip_code;
    if (password) {
      user.password = password;
    }
    await user.save()

    response.message = 'User updated successfully'
    res.send(response.response)
  }

  async getUserById(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const id = (req.params.id as any)

    const data = await User.findByPk(id)

    if (!data) {
      response.message = 'User not found'
      response.status = 400;
      response.success = false
      return res.status(400).send(response.response)
    }

    response.data = data
    res.send(response.response)
  }

  async deleteUser(req: express.Request, res: express.Response) {
    const response = new responseUtils()

    const id = (req.params.id as any)


    const data = await User.destroy({
      where: {
        id
      }
    })

    response.message = 'User deleted successfully'
    res.send(response.response)
  }

  userEarnWallet = async (req: express.Request, res: express.Response, next: NextFunction) => {
    const response = new responseUtils;
    try {
      const user_id = (req.params.id as any)
      const user = await User.findByPk(user_id)

      if (!user) {
        throw createError(400, 'Something wronge with user')
      }

      const wallet = await EarnWallet.findOne({
        where: {
          user_id: user_id
        },
        order: [
          ['id', 'DESC'],
        ]
      })

      
      
      response.data = wallet ? wallet : { total_amount: 0 };
      return res.send(response.response)

      
    } catch (error) {
      next(error)
    }
  }

  userEarnWalletUpdate = async (req: express.Request, res: express.Response, next: NextFunction) => {
    const response = new responseUtils;
    try {
      const user_id = (req.params.id as any)
      const { type, amount } = req.body;
      const user = await User.findByPk(user_id)
      if (!user) {
        throw createError(400, 'Something wronge with user')
      }
      const wallet = await EarnWallet.findOne({
        where: {
          user_id: user_id
        },
        order: [
          ['id', 'DESC'],
        ]
      })

      if(!amount) throw createError(400, 'Enter amount')

      let newAmount = 0;

      if (wallet) {
        newAmount = wallet.total_amount;
      }

      if (type === 'add') {
        newAmount = newAmount + parseInt(amount);
      } else if (type === 'deduct') {
        if (newAmount < parseInt(amount)) {
          throw createError(400, 'Insufficient balance')
        }
        newAmount = newAmount - parseInt(amount);
      } else {
        throw createError(400, 'Action type missing')
      }

      await EarnWallet.create({
        user_id: user_id,
        total_amount: newAmount,
        amount,
        purpose: 'Add by admin',
      })


      response.message = 'Wallet updated successfully'

      return res.send(response.response)



      
    } catch (error) {
      console.log(error)
      next(error)
    }
  }

  myEarnWallet = async (req: express.Request, res: express.Response, next: NextFunction) => {
    const response = new responseUtils;
    try {
      const user_id = req.user.id
      const user = await User.findByPk(user_id)

      if (!user) {
        throw createError(400, 'Something wronge with user')
      }

      const wallet = await EarnWallet.findOne({
        where: {
          user_id: user_id
        },
        order: [
          ['id', 'DESC'],
        ]
      })

      
      
      response.data = wallet ? wallet : { total_amount: 0 };
      return res.send(response.response)

      
    } catch (error) {
      next(error)
    }
  }


  getUserSearch = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {
      const query = req.query.q || '';
      const user = await User.findAll({
        attributes: [
          'id',
          [Sequelize.fn('concat', Sequelize.col('username'), ' [', Sequelize.col('email'), '] [', Sequelize.col('phone'), ']'), 'name']
        ],
        where: {
          [Op.or]: [
            {
              id: { [Op.like]: `%${query}%` }
            },
            {
              username: { [Op.like]: `%${query}%` }
            },
            {
              email: {
                [Op.like]: `%${query}%`
              }
            },
            {
              phone: {
                [Op.like]: `%${query}%`
              }
            }
          ]
        },
        limit: 10
      })
      response.data = user;
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  getBanners = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {

      const banners = await Banner.findAll({
        where: {
          isactive: 1
        }
      })
      response.data = banners
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  getNotices = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {

      const notices = await Notice.findAll();
      response.data = notices
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  getNoticModal = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {

      const notices = await Notice.findOne({
        where: {
          for_home_modal: 1,
          is_active: 1
        },
        order: [
          ['id', 'ASC'],
        ]
      });
      response.data = notices || {}
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  getNoticHeader = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {

      const notices = await Notice.findOne({
        where: {
          for_home_modal: 2,
          is_active: 1
        },
        order: [
          ['id', 'ASC'],
        ]
      });
      response.data = notices || {}
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  getTopupProducts = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {

      const products = await TopupProduct.findAll({
        where: {
          is_active: 1
        },
        order: [
          ['serial', 'ASC'],
        ]
      })
      response.data = products
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  getTopupPackagesByProductId = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {

      const product_id = (req.params.id as any)

      const product = await TopupProduct.findByPk(product_id)

      if (!product) {
        response.message = 'TopupProduct not found';
        return res.status(400).send(response.internalError)
      }

      const packages = await TopupPackage.findAll({
        where: {
          product_id,
        },
        order: [
          ['serial', 'ASC'],
        ]
      })
      // response.data = { ...product, topuppackage: packages }
      response.data = { product, packages }
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  getPaymentMethod = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;

    try {
      const paymentMethods = await PaymentMethod.findAll({
        where: {
          status: 1
        }
      })
      response.data = paymentMethods
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }

  }

  userTransaction = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;

    const id = req.user.id;

    try {
      const userTransactions = await Transaction.findAll({
        where: {
          user_id: id,
        },
        order: [
          ['id', 'DESC']
        ],
      })

      response.data = userTransactions;
      res.send(response.response);

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }

  }

  myOrder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;

    const id = req.user.id;

    try {
      const orders = await Order.findAll({
        where: {
          user_id: id,
        },
        order: [
          ['created_at', 'DESC'],
        ],
        attributes: { exclude: ['uc', 'ingamepassword', 'bprice'] }
      })

      response.data = orders
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }

  }

  orderList = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;

    const product_id = req.params.product_id;

    try {
      const orders = await Order.findAll({
        attributes: ['id', 'name', 'playerid', 'status', 'created_at', 'amount',
          [Sequelize.literal('TIMESTAMPDIFF(SECOND, created_at, updated_at)'), 'diff_in_seconds']],
        where: {
          product_id: product_id
        },
        order: [
          ['created_at', 'DESC'],
        ],
        limit: (product_id == '16') ? 500 : 20
      });

      response.data = orders
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }

  }

  getProductOrders = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;

    try {
      const orders = await Order.findAll({
        attributes: ['id', 'name', 'playerid', 'status', 'created_at', 'updated_at',
          [Sequelize.literal('TIMESTAMPDIFF(SECOND, created_at, updated_at)'), 'diff_in_seconds']
          ],
        order: [
          ['created_at', 'DESC'],
        ],
        limit: 20
      });

      response.data = orders
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }

  }

  getUserWithdrawRequest = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {
      const reqeusts = await WithdrawEarnWallet.findAll({
        where: {
          user_id: req.user.id
        },
        order: [
          ['id', 'DESC']
        ]
      });

      response.data = reqeusts;

      res.send(response.response);
      
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  async topupPackageOrder(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const {
        topuppackage_id,
        product_id,
        name,
        accounttype,
        ingameid,
        ingamepassword,
        playerid,
        phone,
        payment_mathod,
        securitycode,
      } = req.body;

      let user_id = req.user.id

      const topupPackage = await TopupPackage.findByPk(topuppackage_id)

      if (!topupPackage) {
        response.message = 'Topup package not found'
        return res.status(400).send(response.response)
      }
      // const topupPaymentMethods = await PaymentMethod.query().where("is_active", 1).fetch()
      // const payments = topupPaymentMethods.rows.map(data => data.payment_method)

      let amount = parseInt(topupPackage.price)
      let bprice = parseInt(topupPackage.bprice)

      let product = await TopupProduct.findByPk(product_id);

      if (!product) {
        response.message = 'TopupProduct not found'
        return res.status(400).send(response.response)
      }
      if (product.is_active == 0) {
        response.message = 'TopupProduct is not available for order'
        return res.status(400).send(response.response)
      }

      if (product.is_offer == 1 && product.offer_items > 0) {
        product.offer_items = (product.offer_items - 1);
        product = await product.save();
      }

      if (product.is_offer == 1 && product.offer_items <= 0) {
        response.message = 'This offer is not available at this time'
        return res.status(400).send(response.response)
      }

      if (product.is_offer == 1) {
        const checkOrder = await Order.count({
          where: {
            playerid: playerid,
            product_id: product_id
          }
        });
        if(checkOrder > 0) {
          response.message = 'This offer has already been taken by this player ID'
          return res.status(400).send(response.response)
        }
      }

      // if (bprice > product.price) {
      //   response.message = 'Stock out';
      //   return res.status(400).send(response.response);
      // }

      const user = await User.findByPk(user_id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      let wallet = user.wallet;


      if (wallet < amount && payment_mathod != "auto_payment") {
        response.message = 'Not enough balance';
        return res.status(400).send(response.response);
      }

      let order_status = 'pending';
      let unipin_code = '';
      let hold_unipin_id = 0;

      if(topupPackage.type == '2') { // UNIPIN PACKAGE
        const store_unipin = await StoreUnipin.findOne({
          where: {
            status: 1,
            uc: topupPackage.uc
          },
          order: Sequelize.literal('RAND()')
        });
        if (!store_unipin) {
          response.message = 'UniPin Stock Out For This Product (' + topupPackage.name + ')';
          return res.status(404).send(response.response);
        }
        
        order_status = 'completed';
        unipin_code = store_unipin.code;
        
        if (payment_mathod != "auto_payment") {
          store_unipin.status = 2;
          store_unipin.user_id = user_id;
          await store_unipin.save();
        } else {
          hold_unipin_id = store_unipin.id;
          store_unipin.status = 5;
          await store_unipin.save();
        }
      }

      const user_order_data = {
        topuppackage_id,
        product_id,
        name: topupPackage.name,
        accounttype,
        payment_status: 1,
        ingameid,
        ingamepassword,
        playerid,
        phone,
        securitycode,
        status: order_status,
        payment_mathod: 'wallet',
        brief_note: (unipin_code == '') ? '' : 'UniPin: ' + unipin_code,
        user_id,
        amount,
        bprice,
      };

      if (payment_mathod === 'pay') {
        // product.price = product.price - bprice;
        // await product.save();

        // Updating user wallet
        if (wallet - amount >= 0) {
          user.wallet = user.wallet - amount
        } else {
          user.wallet = 0;
        }

        await user.save();
      } else if(payment_mathod === 'auto_payment') {

        const meta_data = {
          "token": "18b2ca74b5fe2f63d8293687d94fde987925c98f",
          "id": user.id,
          "phone": user.phone,
          "wallet": user.wallet,
          "city": user.city,
          "address": user.address,
          "zip_code": user.zip_code,
          "paymentmethod": payment_mathod === 'auto_payment' ? 1 : (payment_mathod === 'pay' ? 4 : payment_mathod),
          "seller_id": user.phone,
          "unipin_id": hold_unipin_id,
          "order": user_order_data
        }

        const fastPayData = await fastPay({
          full_name: user.email,
          email: user.email,
          amount: amount,
          metadata: meta_data,
          redirect_url: 'https://rrrbazar.com/profile/order',
          cancel_url: 'https://rrrbazar.com/profile/order',
          webhook_url: 'https://api.rrrbazar.com/api/v1/webhook',
        });
        response.data = fastPayData;
        return res.send(response.response)
      } else {
        response.message = 'Invalid payment method'
        return res.status(400).send(response.internalError)
      }

      const order = await Order.create(user_order_data)

      // Award coins for purchase (package coin_value, fallback to product coin_value)
      try {
        const coinReward = Number(topupPackage.coin_value || product.coin_value || 0);
        if (coinReward > 0) {
          user.coins = (user.coins || 0) + coinReward;
          await user.save();
          await CoinTransaction.create({
            user_id: user.id,
            amount: coinReward,
            type: 'purchase',
            note: `Order #${order.id} (${topupPackage.name})`,
            reference_id: order.id,
          });
        }
      } catch (e) {
        // never block order on coin rewarding failure
      }

      // AUTO BOT SET IN CODE START
      if(order.status == 'pending' && topupPackage.uc > 0) {
        const store_unipin_auto = await StoreUnipin.findOne({
          where: {
            status: 1,
            uc: topupPackage.uc
          },
          order: Sequelize.literal('RAND()')
        });
        if (!store_unipin_auto) {
          const { uc: ucAlias, ingamepassword: ingamepasswordAlias, bprice: bpriceAlias, ...filteredOrder1 } = order.get({ plain: true });
          response.message = 'Order placed successfully'
          response.data = filteredOrder1
          return res.send(response.response)
        }

        const send_unipin = store_unipin_auto.code;

        store_unipin_auto.status = order.id;
        await store_unipin_auto.save();

        const botStatus = await autoOrder(order.id, playerid, topupPackage.uc, send_unipin);
        order.status = botStatus ? 'In Progress' : 'pending';
        order.uc = send_unipin
        order.ingamepassword = botStatus
        await order.save();
      }
      // AUTO BOT SET IN CODE END

      // if (product.is_offer == 1) {
      //   product.offer_items = (product.offer_items - 1);
      //   await product.save();
      // }
      const { uc: ucAlias, ingamepassword: ingamepasswordAlias, bprice: bpriceAlias, ...filteredOrder } = order.get({ plain: true });

      response.message = 'Order placed successfully'
      response.data = filteredOrder
      return res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  async checkOrder(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const {
        orderid,
        status,
        message
      } = req.body;

      const botUrl = req.headers['cf-connecting-ip'];

      let mystatus = 'pending';
      if(status == 'success') {
        mystatus = 'completed';
      }

      const order = await Order.findByPk(orderid);
      if (!order) {
        response.message = 'order not found';
        return res.status(404).send(response.response);
      }
      order.status = mystatus
      //order.ingamepassword = (botUrl?.toString() ?? '') || '';
      order.securitycode = message
      await order.save();

      const store_unipin = await StoreUnipin.findOne({
        where: {
          status: orderid,
          package_id: order.topuppackage_id
        },
        order: Sequelize.literal('RAND()')
      });
      if (!store_unipin) {
        response.message = 'NOT FOUND';
        return res.status(404).send(response.response);
      }
      store_unipin.status = (mystatus == 'completed') ? 2 : 5;
      await store_unipin.save();

      if(mystatus == 'Failed') {
        // const user = await User.findByPk(order.user_id);
        // if (!user) {
        //   response.message = 'User not found';
        //   return res.status(400).send(response.response);
        // }
        // user.wallet = user.wallet + order.amount;
        // await user.save();
      }
      
      const bot = await AutoServer.findOne({
        where: {
          status: 2,
          ip_url: {
            [Op.like]: '%'+botUrl+'%'
          }
        }
      });

      if (!bot) {
        response.message = 'NOT FOUND';
        return res.status(404).send(response.response);
      }

      bot.status = (status == 'failure_captcha_pending') ? 3 : 1;
      //bot.total_order = bot.total_order + 1;
      await bot.save();

      response.message = 'Order updated successfully'
      return res.send(response.response)
    } catch (error) {
      res.status(400).send(response.internalError);
    }
  }

  async addWallet(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const {
        purpose,
        amount,
        number,
        paymentmethod
      } = req.body;

      let user_id = req.user.id

      const user = await User.findByPk(user_id);

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response);
      }

      if (!user_id || amount < 0) {
        response.message = 'Please Refresh The Page And Send Again';
        return res.status(400).send(response.response)
      }

      const checkPendingOrder = await Transaction.count({
        where: {
          user_id,
          status: 'pending'
        }
      })


      if (checkPendingOrder > 5) {
        response.message = 'You Have Already A Pending Order. Please Completed To Add Another Order';
        return res.status(400).send(response.response)
      }

      const meta_data = {
        "token": "18b2ca74b5fe2f63d8293687d94fde987925c98f",
        "id": user.id,
        "phone": user.phone,
        "wallet": user.wallet,
        "city": user.city,
        "address": user.address,
        "zip_code": user.zip_code,
        "paymentmethod": paymentmethod,
        "seller_id": number
      }

      if(paymentmethod == 4) {
        const fastPayData = await fastPay({
          full_name: user.email,
          email: user.email,
          amount: amount,
          metadata: meta_data,
          redirect_url: 'https://rrrbazar.com/profile/transaction',
          cancel_url: 'https://rrrbazar.com/profile/add-money',
          webhook_url: 'https://api.rrrbazar.com/api/v1/webhook',
        });
        response.data = fastPayData;
        return res.send(response.data)
      } else {
        const createTransaction = await Transaction.create({
          user_id,
          purpose,
          amount,
          number,
          paymentmethod_id: paymentmethod,
          status: 'pending'
        })

        response.data = createTransaction;
        return res.send(response.response)
      }

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  async userProfile(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    const id = req.user.id
    try {

      const user = await User.findByPk(id)

      if (!user) {
        response.message = 'No user found';
        return res.status(400).send(response.response);
      }

      response.data = user
      return res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError);
    }
  }

  async searchResetPasswordUser(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const { identity } = req.body

      const user = await User.findOne({
        where: {
          ...(
            isNaN(identity) ? {
              email: identity
            } : {
              phone: identity
            }
          )
        }
      })

      if (!user) {
        response.message = "User not found"
        return res.status(400).send(response.response)
      }

      response.data = user
      return res.send(response.response)

    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async resetPassword(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const { token, password, confirm_password } = req.body
      const passwordReset = await PasswordReset.findOne({
        where: {
          token: { [Op.like]: `%${token}%` },
        },
        order: [
          ['id', 'DESC'],
        ]
      })

      if (!passwordReset) {
        response.message = "Invaild Token"
        return res.status(400).send(response.response)
      }

      const currTime = new Date();
      const otpTime = new Date(passwordReset.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) { // 10 min to expire token
        response.message = 'Expired token'
        return res.status(400).send(response.response)
      }

      if (!password) {
        response.message = "New password required"
        return res.status(400).send(response.response)
      }

      if (password !== confirm_password) {
        response.message = "Confrim password not match"
        return res.status(400).send(response.response)
      }

      const user = await User.findByPk(passwordReset.user_id);
      if (!user) {
        response.message = "User not found"
        return res.status(400).send(response.response)
      }

      user.password = password;
      await user.save();

      response.message = 'Password reset Success'
      res.send(response.response)
    } catch (error) {
      console.log(error)
      return res.status(400).send(response.internalError)
    }
  }

  async resetPasswordOtp(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const { id } = (req.params as any)
      const user = await User.findByPk(id)

      if (!user) {
        response.message = 'User not found'
        return res.status(400).send(response.response)
      }

      const otpCode = Math.floor(Math.random() * 90000) + 10000;
      await smsHelper(user.phone, `Your ${process.env.APP_NAME} OTP Code is ` + otpCode);

      await Otp.create({
        user_id: user.id,
        otp: otpCode,
        type: "reset_password",
      })

      response.data = { action: 'reset_password' }

      return res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async resetPasswordVerify(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const { id } = (req.params as any)
      const user = await User.findByPk(id)

      if (!user) {
        response.message = 'User not found'
        return res.status(400).send(response.response)
      }

      // let otp = await Otp.query()
      //   .where({ 'user_id': user.id, type: 'reset_password' })
      //   .last();
      let otp = await Otp.findOne({
        where: {
          user_id: user.id,
          type: 'reset_password'
        },
        order: [
          ['id', 'DESC'],
        ]
      })

      if (!otp) {
        response.message = 'Invalid Otp'
        return res.status(400).send(response.response)
      }


      if (otp.otp != req.body.otp) {
        response.message = 'Invalid Otp'
        return res.status(400).send(response.response)
      }

      const currTime = new Date();
      const otpTime = new Date(otp.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) { // 10 min to expire otp
        response.message = 'Otp is expired, Please resend otp code'
        return res.status(400).send(response.response)
      }

      const token = crypto.randomBytes(40).toString('hex');

      const returnData = await PasswordReset.create({
        user_id: user.id,
        token,
      })

      response.data = { reset_token: returnData.token }

      res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }
  }

  async getActivePaymentMethods(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const topupPaymentMethods = await TopupPaymentMethod.findAll({
        where: {
          is_active: 1
        }
      })
      const payments = topupPaymentMethods.map(data => data.payment_method)
      response.data = payments

      res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }

  }

  async changePhone(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {

      const { phone, } = req.body
      const id = req.user.id
      let user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found'
        return res.status(400).send(response.response)
      }

      user.phone = phone;
      user.is_phone_verify = 0;
      await user.save();
      response.message = 'Phone changed successfully'
      res.send(response.response)
    } catch (error) {
      res.status(500).send(response.internalError)
    }
  }
  async verifyPhone(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const id = req.user.id
      const otpCode = Math.floor(Math.random() * 90000) + 10000;

      let user = await User.findByPk(id);

      if (!user) {
        response.message = 'User not found'
        return res.status(400).send(response.response)
      }

      await Otp.create({
        user_id: id,
        otp: otpCode,
        type: 'phone_verify'
      })
      await smsHelper(user.phone, `Your ${process.env.APP_NAME} OTP Code is ` + otpCode);

      res.send({ action: 'phone_verify' })
    } catch (error) {
      res.status(500).send(response.internalError)
    }
  }

  async verifyOtp(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const { otp } = req.body
      const id = req.user.id
      let user = await User.findByPk(id);

      // let otp = await Otp.query().where('user_id', user.id).last();
      let findOtp = await Otp.findOne({
        where: {
          user_id: id,
        },
        order: [
          ['created_at', 'DESC'],
        ],
      })

      if (!findOtp || !user) {
        response.message = 'Failed to verify ypur otp'
        return res.status(400).send(response.response)
      }

      if (findOtp.otp != otp) {
        response.message = 'Invalid Otp'
        return res.status(400).send(response.response)
      }

      const currTime = new Date();
      const otpTime = new Date(otp.created_at);
      const diffTime = currTime.getTime() - otpTime.getTime();
      if (diffTime > 600000) { // 10 min to expire otp
        response.message = 'Expired Otp'
        return res.status(400).send(response.response)
      }


      if (otp.type === 'phone_verify') {
        user.is_phone_verify = 1;
        await user.save();
      }

      response.message = 'OTP verified successfully'
      res.send(response.response)

    } catch (error) {
      res.status(500).send(response.internalError)
    }
  }

  async getInventories(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {

      const limit: any = parseInt(req.query.limit?.toString() || '10')
      const data = await Inventorie.findAll({
        limit: limit,
      })

      response.data = data
      res.send(response.response)

    } catch (error) {
      res.status(500).send(response.internalError)
    }
  }

  async getInventoriesById(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const id = (req.params.id as any)

      const data = await Inventorie.findByPk(id)

      if (!data) {
        response.message = 'TopupProduct not found'
        return res.status(400).send(response.response)
      }
      response.data = data
      res.send(response.response)

    } catch (error) {
      res.status(500).send(response.internalError)
    }
  }

  async cartProducts(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const ids = (req.query?.product_ids as any).split(',')
      const data = await Inventorie.findAll({
        where: {
          id: ids
        }
      })

      response.data = data
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }

  }
  async resetPasswordDirect(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {

      const { identity } = req.body

      const user: any = await User.findOne({
        where: {
          ...(
            isNaN(identity) ? {
              email: identity
            } : {
              phone: identity
            }
          )
        }
      })

      if (!user) {
        response.message = 'User not found'
        return res.status(400).send(response.internalError)
      }

      const otpCode = Math.floor(Math.random() * 90000) + 10000;
      await smsHelper(user.phone, `Your ${process.env.APP_NAME} OTP Code is ` + otpCode);

      await Otp.create({
        user_id: user.id,
        otp: otpCode,
        type: "reset_password",
      })

      const user_phone: string = user.phone
      const splitPhone = user_phone.split('')
      const firstPartOfNumber = splitPhone.slice(0, 3).join('')
      const lastPartOfNumber = splitPhone.slice(Math.max(user_phone.length - 3, 1)).join('')
      const startCount = user_phone.length - (firstPartOfNumber.length + lastPartOfNumber.length)
      const stars = [...new Array(startCount)].map(e => '*').join('')
      const hiddenPhone = firstPartOfNumber + stars + lastPartOfNumber

      delete user.phone;

      response.data = {
        user: user,
        starsPhone: hiddenPhone
      }
      return res.send(response.response)


    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }

  }
  productOrder = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {
      const productId = req.body.product_id
      const user = await User.findByPk(req.user.id)

      const product = await Product.findByPk(productId)

      if (!product) {
        response.message = 'Product not found';
        return res.status(400).send(response.response)
      }
      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response)
      }

      if (product.quantity <= 0) {
        response.message = 'Product is stock out';
        return res.status(400).send(response.response)
      }

      if (user.wallet < product.sale_price) {
        response.message = 'You do not have enough money';
        return res.status(400).send(response.response)
      }

      product.quantity = product.quantity - 1

      user.wallet = user.wallet - product.sale_price
      await user.save()
      await product.save()


      await ProductOrder.create({
        product_id: product.id,
        user_id: user.id,
        amount: product.sale_price,
        status: 'pending'
      })

      response.message = 'Order placed successfully';
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }

  }

  getMyShopList = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {
      const limit: any = parseInt(req.query.limit?.toString() || '15')
      const page: any = parseInt(req.query.page?.toString() || '1')


      const userId = req.user.id
      const totalCount = await ProductOrder.count({
        where: {
          user_id: userId,
        }
      })
      const shopLists = await ProductOrder.findAll({
        where: {
          user_id: userId,
        },
        offset: (page - 1) * limit,
        limit: limit,
        order: [
          ['id', 'DESC']
        ],
        include: [
          // {
          //     model: User,
          // },
          {
            model: Product
          }
        ],
      })

      response.data = {
        nextPage: parseInt(page) * parseInt(limit) < totalCount ? parseInt(page) + 1 : undefined,
        data: shopLists
      };
      res.send(response.response)
    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }

  }

  getWithdrawEarnWallet = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {

      const {
        amount,
        number,
        payment_method
      } = req.body;

      const userId = req.user.id
      const user = await User.findByPk(userId)

      if (!user) {
        response.message = 'User not found';
        return res.status(400).send(response.response)
      }

      const earnWallet = await EarnWallet.findOne({
        where: {
          user_id: userId,
        },
        order: [
          ['id', 'DESC']
        ],
      })

      if(!earnWallet) {
        response.message = 'You do not have enough money';
        return res.status(400).send(response.response)
      }

      if (earnWallet.total_amount < amount) {
        response.message = 'You do not have enough money';
        return res.status(400).send(response.response)
      }

      await EarnWallet.create({
        user_id: userId,
        amount: amount,
        total_amount: earnWallet.total_amount - amount,
        purpose: 'withdraw'
      })


      await WithdrawEarnWallet.create({
        user_id: userId,
        amount,
        number,
        payment_method,
        status: 'pending'
      })

      response.message = 'Withdraw request placed successfully';
      res.send(response.response)

    } catch (error) {
      console.log(error)
      res.status(400).send(response.internalError)
    }

  }

  async getPlayerName(req: express.Request, res: express.Response) {
    const response = new responseUtils;
    try {
      const allowedDomains = ['https://rrrbazar.com', 'https://www.rrrbazar.com'];
      const origin = req.get('Origin') || req.get('Referer');

      // Check if the request is from one of the allowed domains
      if (!origin || !allowedDomains.includes(new URL(origin).origin)) {
        return res.status(403).send("Access denied: Unauthorized domain");
      }
      
      const playerid = req.params.playerid;

      const playerData = await playerName(playerid);
      response.data = playerData;
      return res.send(response.data)

    } catch (error) {
      res.status(400).send(response.internalError);
    }
  }

  uddoktaPay = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils;
    try {
      const {
        full_name,
        email,
        amount,
        invoice_id,
        metadata,
        payment_method,
        sender_number,
        transaction_id,
        status,
        paymentmethod
      } = req.body;

      //const uak = req.headers['RT_UDDOKTAPAY_API_KEY'];

      const user = await User.findByPk(metadata.id)
      if (!user) {
        res.send({
          status: 'failure',
          statusCode: 400,
          message: 'User not found!'
        });
      }

      if (metadata.token == null || metadata.token == '' || typeof metadata.token === 'undefined') {
        res.send({
          status: 'failure',
          statusCode: 403,
          message: 'api issue found!'
        });
      }

      if (metadata.token != '18b2ca74b5fe2f63d8293687d94fde987925c98f') {
        res.send({
          status: 'failure',
          statusCode: 403,
          message: 'Unauthorized Action!'
        });
      }

      const pm = await PaymentMethod.findByPk(metadata.paymentmethod)
      if (pm) {
        metadata.seller_id = (pm.info != '') ? pm.info : 13
      } else {
        metadata.seller_id = 13
      }

      // var cdate = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0,10).replace('T', ' ');
      // let dateStart = cdate + " 00:00:00";
      // let dateEnd = cdate + " 23:59:59";

      // let countTrans = await Transaction.count({
      //   where: {
      //     user_id: metadata.id,
      //     paymentmethod_id: metadata.paymentmethod,
      //     created_at: {
      //       [Op.between]: [dateStart, dateEnd]
      //     }
      //   }
      // })

      // let findTrans = await Transaction.findOne({
      //   where: {
      //     user_id: metadata.id,
      //     paymentmethod_id: metadata.paymentmethod,
      //     number: sender_number,
      //     created_at: {
      //       [Op.between]: [dateStart, dateEnd]
      //     }
      //   },
      //   order: [
      //     ['created_at', 'asc'],
      //   ],
      // })

      const createTransaction = await Transaction.create({
        user_id: metadata.id,
        purpose: 'fastPay',
        // purpose: (!findTrans && countTrans > 0) ? 'addwallet' : 'fastPay',
        amount,
        number: sender_number,
        paymentmethod_id: metadata.paymentmethod,
        action_by: metadata.seller_id,
        // action_by: (!findTrans && countTrans > 0) ? null : metadata.seller_id,
        status: status.toLowerCase()
        // status: (!findTrans && countTrans > 0) ? 'pending' : status.toLowerCase()
      })

      // if (!findTrans && countTrans > 0) {
      //   return res.send({
      //     status: 'failure',
      //     statusCode: 403,
      //     message: 'Invalid Number'
      //   });
      // }

      if (status.toLowerCase() == 'completed' && user && !metadata?.order) {
        user.wallet = user.wallet + parseInt(amount)
        await user.save()

        if (metadata.seller_id){
          const admin = await Admin.findByPk(metadata.seller_id);
          if(admin) {
            admin.wallet = admin.wallet + parseInt(amount);
            await admin.save();
          }
        }
      }

      // if (metadata?.order && !(!findTrans && countTrans > 0)) {
      if (metadata?.order) {
        const order = await Order.create(metadata?.order);

        // AUTO BOT SET IN CODE START
        const topupPackage = await TopupPackage.findByPk(order.topuppackage_id)

        if (!topupPackage) {
          response.data = createTransaction;
          return res.send(response.data)
        }

        if(order.status == 'pending' && topupPackage.uc > 0) {
          const store_unipin_auto = await StoreUnipin.findOne({
            where: {
              status: 1,
              uc: topupPackage.uc
            },
            order: Sequelize.literal('RAND()')
          });
          if (!store_unipin_auto) {
            response.data = createTransaction;
            return res.send(response.data)
          }

          const myunipincode = store_unipin_auto.code

          store_unipin_auto.status = order.id;
          await store_unipin_auto.save();

          const botStatus = await autoOrder(order.id, order.playerid, topupPackage.uc, myunipincode);
          order.status = botStatus ? 'In Progress' : 'pending'
          order.uc = myunipincode
          order.ingamepassword = botStatus
          await order.save();
          
        }
        // AUTO BOT SET IN CODE END
      }

      // if (metadata?.unipin_id && metadata?.unipin_id > 0 && !(!findTrans && countTrans > 0)) {
      if (metadata?.unipin_id && metadata?.unipin_id > 0) {
        let store_unipin = await StoreUnipin.findByPk(metadata?.unipin_id);

        if (!store_unipin) {
          response.message = 'UNIPIN NOT UPDATED';
          return res.status(404).send(response.response);
        }

        store_unipin.status = 2;
        store_unipin.user_id = metadata?.id;
        await store_unipin.save();
      }

      response.data = createTransaction;
      return res.send(response.data)

    } catch (error) {
      res.status(400).send(response.internalError);
    }
  }

  // getMyShopList = async (req: express.Request, res: express.Response) => {
  //   const response = new responseUtils;
  //   try {

  //   } catch (error) {
  //     console.log(error)
  //     res.status(400).send(response.internalError)
  //   }

  // }







}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new UserController();
