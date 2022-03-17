import Twitter from 'twitter'
import {isString} from 'util'
import * as fs from 'fs'
import * as core from '@actions/core'

export async function uploadMedia(mediaPaths: string[]): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    core.debug(JSON.stringify(mediaPaths))
    for (const path of mediaPaths) {
      if (!isString(path)) {
        throw new Error('media path not a string')
      }
      if (!fs.existsSync(path)) {
        throw new Error(`${path} not exists`)
      }
    }

    const consumer_key = process.env.CONSUMER_API_KEY as string
    const consumer_secret = process.env.CONSUMER_API_SECRET_KEY as string
    const access_token_key = process.env.ACCESS_TOKEN as string
    const access_token_secret = process.env.ACCESS_TOKEN_SECRET as string

    const client = new Twitter({
      consumer_key,
      consumer_secret,
      access_token_key,
      access_token_secret
    })

    try {
      const promises = mediaPaths.map(async path => {
        const mediaType = 'video/mp4'
        const mediaData = fs.readFileSync(path)
        const mediaSize = fs.statSync(path).size
        new Error('media size: ' + mediaSize)
        let mediaId = await client
          .post('media/upload', {
            command: 'INIT',
            total_bytes: mediaSize,
            media_type: mediaType
          })
          .then(data => data.media_id_string)
        mediaId = await client
          .post('media/upload', {
            command: 'APPEND',
            media_id: mediaId,
            media: mediaData,
            segment_index: 0
          })
          .then(data => data.media_id_string)
        return await client.post('media/upload', {
          command: 'FINALIZE',
          media_id: mediaId
        })
      })

      const responses = await Promise.all(promises)
      resolve(
        responses.map(x => {
          core.debug(`ResponseData: ${JSON.stringify(x)}`)
          return x.media_id_string
        })
      )
    } catch (error) {
      reject(new Error('upload failed'))
    }
  })
}
