    map={"BDMB-T-S":"🔰 20-UC Voucher",
    "UPBD-Q-S":"🔰 20-UC Voucher",

    "BDMB-U-S":"🔰 36-UC Voucher",
    "UPBD-R-S":"🔰 36-UC Voucher",

    "BDMB-J-S":"🔰 80-UC Voucher",
    "UPBD-G-S":"🔰 80-UC Voucher",

    "BDMB-I-S":"🔰 160-UC Voucher",
    "UPBD-F-S":"🔰 160-UC Voucher",

    "BDMB-K-S":"🔰 405-UC Voucher",
    "UPBD-H-S":"🔰 405-UC Voucher",

    "BDMB-L-S":"🔰 810-UC Voucher",
    "UPBD-I-S":"🔰 810-UC Voucher",

    "BDMB-M-S":"🔰 1625-UC Voucher",
    "UPBD-J-S":"🔰 1625-UC Voucher",

    "BDMB-Q-S":"🟪 Weekly-UC Vouchers",
    "UPBD-N-S":"🟪 Weekly-UC Vouchers",

    "BDMB-S-S":"🟧Monthly-UC Vouchers",
    "UPBD-P-S":"🟧Monthly-UC Vouchers"
    }

according to this mapping, create a auto distribution system for adding vouchers to packages. this means we have to create a new endpoint and new modal similar to @rrrbazar-admin/src/components/Packages/Voucher/ add voucher modal in @rrrbazar-admin/src/components/Vouchers/VoucherStatistic.js , on top of the table add a new button Add vouchers, based on the input in simlar format as to the reference voucher modal, the input will need to be cleaned at first removing any extra data, create a dedicated function for that,then according tp this map, the endpoint need to search packages and bulk insert vouchers for this packages those match with this map.
