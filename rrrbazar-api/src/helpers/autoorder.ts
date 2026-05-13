import fetch from 'node-fetch';
import { Op, Sequelize } from 'sequelize';
import Schema from '../models';
const {
  AutoServer
} = Schema;

const autoOrder = async (order_id: number, player_id: string, package_id: number, unipin: string, dtype: string = '80') => {
  let success: any;
  try {
    let bot_url = "";
    let bot: any = await AutoServer.findOne({
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
        url: `${process.env.API_URL || "https://api.rrrbazar.com"}/api/v1/check_order?type=${dtype}`
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

export default autoOrder;
