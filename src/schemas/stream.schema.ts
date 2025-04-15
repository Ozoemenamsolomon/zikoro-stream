import { z } from "zod";

export const createStream = z.object({
    title: z.string(),
    image: z.any(),
    workspace: z.string(),
   
    streamAlias: z.string(),
    settings: z.object( {
        registration: z.boolean(),
    })

})

export const createStreamBanner = z.object({
    content: z.string(),
    backgroundColor: z.string(),
    textColor: z.string()
})