declare namespace Express {
    interface Request{
        user: {
            id: number
        },
        admin: {
            id: number
        }
    }
}