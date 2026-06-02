import express from "express";
import { col, fn } from "sequelize";
import Schema from "../models";
import responseUtils from "../utils/response.utils";

const { Notice } = Schema;

class NoticeController {
  async getNotices(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const reqPath = req.protocol + "://" + req.get("host");

    const data = await Notice.findAll({
      attributes: {
        include: [
          "image",
          "product_id",
          [
            fn("CONCAT", reqPath + "/images/", col("Notice.image")),
            "image_full_url",
          ],
        ],
      },
    });
    response.data = data;
    res.send(response.response);
  }

  async getNoticeById(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const reqPath = req.protocol + "://" + req.get("host");
    //
    const id = req.params.id as any;
    const data = await Notice.findOne({
      where: {
        id,
      },
      attributes: {
        include: [
          "image",
          "product_id",
          [
            fn("CONCAT", reqPath + "/images/", col("Notice.image")),
            "image_full_url",
          ],
        ],
      },
    });

    if (!data) {
      response.status = 400;
      response.success = false;
      response.message = "Notice not found";
      return res.status(400).send(response.response);
    }

    response.data = data;
    res.send(response.response);
  }

  async createNotice(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const {
      title,
      image,
      link,
      notice,
      for_home_modal,
      is_active,
      type,
      button_text,
      product_id,
    } = req.body;

    // image and link are only meaningful for 'normal' popups. For
    // marquee/navbar_bottom strips we drop them so empty strings don't
    // pollute the data and the CMS-side conditional rendering stays clean.
    const noticeType = type || "normal";
    const isStrip = noticeType === "marquee" || noticeType === "navbar_bottom";

    const data = await Notice.create({
      title,
      image: isStrip ? "" : image || "",
      link: isStrip ? "" : link || "",
      notice,
      for_home_modal,
      template: "image_title_detail_grid",
      is_active,
      type: noticeType,
      button_text: isStrip ? "" : button_text || "",
      product_id: product_id || null,
    });
    response.data = data;
    res.send(response.response);
  }

  async updateNotice(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.params.id as any;
    const {
      title,
      image,
      link,
      notice,
      for_home_modal,
      is_active,
      type,
      button_text,
      product_id,
    } = req.body;

    const findNotice = await Notice.findByPk(id);

    if (!findNotice) {
      response.status = 400;
      response.success = false;
      response.message = "Notice not found";
      return res.status(400).send(response.response);
    }

    const noticeType = type || findNotice.type || "normal";
    const isStrip = noticeType === "marquee" || noticeType === "navbar_bottom";

    findNotice.title = title;
    findNotice.image = isStrip ? "" : image || "";
    findNotice.link = isStrip ? "" : link || "";
    findNotice.notice = notice;
    findNotice.for_home_modal = for_home_modal;
    findNotice.template = "image_title_detail_grid";
    findNotice.is_active = is_active;
    findNotice.type = noticeType;
    findNotice.button_text = isStrip ? "" : button_text || "";
    findNotice.product_id = product_id || null;

    await findNotice.save();

    response.data = findNotice;
    res.send(response.response);
  }

  async deleteNotice(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const id = req.params.id as any;

    await Notice.destroy({
      where: {
        id,
      },
    });

    response.message = "Deleted successfully";
    res.send(response.response);
  }
}

export default new NoticeController();
