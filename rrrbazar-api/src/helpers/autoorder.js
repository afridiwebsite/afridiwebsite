import fetch from 'node-fetch';
const { Op, Sequelize } = require('sequelize');
import Schema from '../models';
const {
  AutoServer
} = Schema;



const autoOrder = async (order_id, player_id, package_id, unipin, dtype = '80') => {
  let success;
  try {
    let bot_url = "";
    let bot = await AutoServer.findOne({
      attributes: [
        [Sequelize.fn('MIN', Sequelize.col('total_order')), 'min_val'],
        'ip_url',
        'id'
      ],
      where: {
        status: {
          [Op.in]: [1, 2]
        }
      },
      group: ['ip_url', 'id'],
      order: [[Sequelize.literal('min_val'), 'ASC']]
    });
    if (!bot) {
      success = false;
      return success;
    }
    bot_url = bot.ip_url;

    // bot.status = 2;
    // bot.total_order = bot.min_val + 1;
    // bot = await bot.save();

    await AutoServer.increment('total_order', {
      by: 1,
      where: {
        id: bot.id
      }
    });

    const response = await fetch(bot_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerid: player_id,
        pacakge: package_id,
        code: unipin,
        orderid: order_id,
        url: 'https://api.rrrbazar.com/api/v1/check_order?type=' + dtype
      })
    });
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    success = bot_url;
    return success;
  } catch (error) {
    console.error('Error:', error);
    success = false;
    return success;
  }
};

module.exports = autoOrder;
