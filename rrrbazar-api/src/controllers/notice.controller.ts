import express from 'express';
import { col, fn, Op } from 'sequelize';
import Schema from '../models';
import responseUtils from '../utils/response.utils';

const {
    Notice
} = Schema;

class NoticeController {

    async getNotices(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const reqPath = req.protocol + "://" + req.get("host");

        const data = await Notice.findAll({
            attributes: {
                include: [
                    "image",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("Notice.image")
                        ),
                        "image_full_url",
                    ],
                ],
            }
        })
        response.data = data
        res.send(response.response)
    }

    async getNoticeById(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const reqPath = req.protocol + "://" + req.get("host");

        const id = (req.params.id as any);
        const data = await Notice.findOne({
            where: {
                id,
            },
            attributes: {
                include: [
                    "image",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("Notice.image")
                        ),
                        "image_full_url",
                    ],
                ],
            }
        })

        if (!data) {
            response.status = 400;
            response.success = false;
            response.message = 'Notice not found';
            return res.status(400).send(response.response)
        }

        response.data = data
        res.send(response.response)
    }

    async createNotice(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const { title, image, link, notice, for_home_modal, template, is_active, type } = req.body

        const checkExist = await Notice.findAll({
            where: {
                [Op.or]: [
                    {
                        notice: notice
                    },
                    {
                        image: image
                    }
                ]
            }
        })

        // if (checkExist?.length > 0) {
        //     response.status = 400;
        //     response.success = false;
        //     response.message = 'Notice is already exist';
        //     return res.status(400).send(response.response)
        // }


        const data = await Notice.create({
            title, image, link, notice, for_home_modal, template: 'image_title_detail_grid', is_active, type
        })
        response.data = data
        res.send(response.response)
    }

    async updateNotice(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = (req.params.id as any);
        const { title, image, link, notice, for_home_modal, template, is_active, type } = req.body

        const findNotice = await Notice.findByPk(id)

        if (!findNotice) {
            response.status = 400;
            response.success = false;
            response.message = 'Notice not found';
            return res.status(400).send(response.response)
        }

        const checkExist = await Notice.findAll({
            where: {
                [Op.or]: [
                    {
                        notice: notice
                    },
                    {
                        image: image
                    }
                ]
            }
        })

        // if (checkExist?.length > 1) {
        //     response.status = 400;
        //     response.success = false;
        //     response.message = 'Notice is already exist';
        //     return res.status(400).send(response.response)
        // }

        findNotice.title = title;
        findNotice.image = image;
        findNotice.link = link;
        findNotice.notice = notice;
        findNotice.for_home_modal = for_home_modal;
        findNotice.template = 'image_title_detail_grid';
        findNotice.is_active = is_active;
        findNotice.type = type;

        await findNotice.save();

        response.data = findNotice
        res.send(response.response)
    }

    async deleteNotice(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = (req.params.id as any);

        await Notice.destroy({
            where: {
                id,
            }
        })

        response.message = 'Deleted successfully'
        res.send(response.response)
    }

}

export default new NoticeController();