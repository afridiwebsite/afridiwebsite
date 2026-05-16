const config = require('../config/CommonPatternConfig')
import { Sequelize, DataTypes, Model, literal } from 'sequelize'

export default (sequelize: Sequelize) => {
    class OrderComment extends Model {
        public id!: number;
        // Rich HTML produced by the admin text editor — kept as TEXT so a long
        // template (with images / formatting) fits comfortably.
        public html!: string;
        // Plaintext stripped from `html` at save time. The order edit modal
        // uses this for the datalist / preview so a copy/paste of the
        // selection lands as readable text in the order's brief_note.
        public plain_text!: string;
        public label!: string;
    }

    OrderComment.init(
        {
            html: {
                // MySQL doesn't allow defaults on TEXT/BLOB columns — leave
                // the default off, the controller always supplies a value.
                type: DataTypes.TEXT('long'),
                allowNull: true,
            },
            plain_text: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            // Short title shown in the picker when the plain text is long.
            label: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: '',
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: literal('NOW()'),
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: literal('NOW()'),
            },
        },
        {
            tableName: 'order_comments',
            modelName: 'OrderComment',
            sequelize,
            ...config.config,
        },
    )

    if (process.env.AUTO_MIGRATION === 'ON') {
        OrderComment.sync({ alter: true }).then()
    }

    return OrderComment
}
