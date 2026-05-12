import Schema from '../models';
import express from 'express'
import responseUtils from '../utils/response.utils';
import { Op, fn, col } from 'sequelize';

const {
    Banner
} = Schema;

class BannerController {

    async getBanners(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const reqPath = req.protocol + "://" + req.get("host");

        const data = await Banner.findAll({
            attributes: {
                include: [
                    "banner",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("Banner.banner")
                        ),
                        "banner_full_url",
                    ],
                ],
            }
        })
        response.data = data
        res.send(response.response)
    }

    async getBannerById(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const reqPath = req.protocol + "://" + req.get("host");

        const id = req.params.id
        const data = await Banner.findOne({
            where: {
                id,
            },
            attributes: {
                include: [
                    "banner",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("Banner.banner")
                        ),
                        "banner_full_url",
                    ],
                ],
            }
        })

        if (!data) {
            response.status = 400;
            response.success = false;
            response.message = 'Banner not found';
            return res.status(400).send(response.response)
        }

        response.data = data
        res.send(response.response)
    }

    async createBanner(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const { note, banner, link, isactive } = req.body

        const checkExist = await Banner.findAll({
            where: {
                [Op.or]: [
                    {
                        note: note
                    },
                    {
                        banner: banner
                    }
                ]
            }
        })

        if (checkExist?.length > 0) {
            response.status = 400;
            response.success = false;
            response.message = 'Banner is already exist';
            return res.status(400).send(response.response)
        }


        const data = await Banner.create({
            note, banner, link, isactive
        })
        response.data = data
        res.send(response.response)
    }

    async updateBanner(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = req.params.id
        const { note, banner, link, isactive } = req.body

        const finBanner = await Banner.findByPk(id)

        if (!finBanner) {
            response.status = 400;
            response.success = false;
            response.message = 'Banner not found';
            return res.status(400).send(response.response)
        }

        const checkExist = await Banner.findAll({
            where: {
                [Op.or]: [
                    {
                        note: note
                    },
                    {
                        banner: banner
                    }
                ]
            }
        })

        if (checkExist?.length > 1) {
            response.status = 400;
            response.success = false;
            response.message = 'Banner is already exist';
            return res.status(400).send(response.response)
        }

        finBanner.note = note;
        finBanner.banner = banner;
        finBanner.link = link;
        finBanner.isactive = isactive;

        await finBanner.save();

        response.data = finBanner
        res.send(response.response)
    }

    async deleteBanner(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = req.params.id

        await Banner.destroy({
            where: {
                id,
            }
        })

        response.message = 'Deleted successfully'
        res.send(response.response)
    }

}

export default new BannerController();