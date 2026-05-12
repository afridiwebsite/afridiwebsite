const {responseFormat} = require('../utils/common.utils')
import Response from '../utils/response.utils';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import urljoin from 'url-join';
import util from '../utils/common.utils'
import express from 'express'

/******************************************************************************
 *                              Upload Controller
 ******************************************************************************/
class UploadController {
    uploadImage = async (req: express.Request, res: express.Response) => {
        const response = new Response();
        try {
            const image = await this.#resizeAndGenerateThumb(req.file)
            const imgUrl = util.getImagePath(req)
            response.data = {
                image,
                image_url: urljoin(imgUrl, image),
                image_thumb_url: urljoin(imgUrl, 'thumb', image)
            }
            res.send(response.response)
        } catch (error) {
            console.log(error)
            response.success = false;
            response.status = 500;
            response.message = 'Image upload failed';
            res.status(500).send(response.response)
        }
    }

    async uploadIcon(req: express.Request, res: express.Response) {
        res.send(responseFormat({image: req?.file?.filename}, true, 200, 'Icon Successfully Uploaded'))
    }

    #resizeAndGenerateThumb = async (file: any) => {
        const { filename: image } = file;
        const buff = await sharp(file.path)
            .resize(900)
            .withMetadata()
            .toBuffer()

        fs.writeFileSync(file.destination + image, buff);
        
        const thumbBuff = await sharp(buff)
            .resize(100)
            .withMetadata()
            .toBuffer()
        fs.writeFileSync(path.join(file.destination, 'thumb', image), thumbBuff)

        return image

    }
}



/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new UploadController;