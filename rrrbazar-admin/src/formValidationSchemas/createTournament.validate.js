import * as Yup from 'yup';
const createTournamentSchema = Yup.object().shape({
    title: Yup.string().required().label('Title').trim(),
    image: Yup.string().required().label('Image').trim(),
    start_time: Yup.string().required().label('Start time').trim(),
    per_kill: Yup.string().required().matches(/^([1-9])/, "Per kill can't be start with 0")
        .matches(/^\d+$/, 'Per kill must be a number').label('Per kill').trim(),
    entry_fee: Yup.string().required().matches(/^([1-9])/, "Entry fee can't be start with 0")
        .matches(/^\d+$/, 'Entry fee must be a number').label('Entry fee').trim(),
    version: Yup.string().required().label('Version').trim(),
    total_prize: Yup.string().required().label('Total Prize').trim(),
    map: Yup.string().required().label('Map').trim(),
    type: Yup.string().required().label('Type').trim(),
    user_limit: Yup.string().required().matches(/^([1-9])/, "User limit can't be start with 0")
        .matches(/^\d+$/, 'User limit must be a number').label('User limit').trim(),
    status: Yup.string().required().label('Status').trim(),
    room_details: Yup.string().required().label('Room details').trim(),
    rules: Yup.string().required().label('Rules').trim(),
    prize: Yup.array().min(1).required().label('Tournament prize')
})

export const addPrizeSchema = Yup.object().shape({
    name: Yup.string().required().label('Name').trim(),
    place: Yup.string().required().label('Place').trim(),
    amount: Yup.string().required().matches(/^\d+$/, 'Amount must be a number').label('Amount').trim(),
})

export default createTournamentSchema;

