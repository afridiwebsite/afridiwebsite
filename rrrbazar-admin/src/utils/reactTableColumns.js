import { toastDefault } from "../utils/handler.utils";
import parse from "html-react-parser";
import moment from "moment";
import Badge from "../components/Badge";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import PlayerKillEditForm from "../components/PlayerKillEditForm";
import PlayerRankingEditForm from "../components/PlayerRankingEditForm";
import ProductDescriptionSeeMore from "../components/ProductDescriptionSeeMore";
import { imgPath } from "./handler.utils";
import Swal from "sweetalert2";

// Shared helper: copies on click and toasts. Renders '---' if empty.
const copyableCell = (label, accessor) => (e) => {
  const value = e.row.original[accessor];
  if (value === null || value === undefined || value === "")
    return <span className="text-gray-400">---</span>;
  return (
    <span
      className="cursor-pointer hover:text-blue-600"
      title={`Click to copy ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(String(value));
        toast.info(`Copied ${label}: ${value}`, toastDefault);
      }}
    >
      {value}
    </span>
  );
};

export const makeOrdersTableColumns = (onAfterRetry = () => {}) => [
  {
    Header: "Order id",
    accessor: "id",
    Cell: copyableCell("Order ID", "id"),
  },
  {
    Header: "Player id",
    accessor: "playerid",
    className: "text-center",
    // Only meaningful when the product has a Player ID dynamic input —
    // otherwise the field is empty (or "UNIPIN_VOUCHER" for the legacy
    // Unipin path). The helper renders '---' for falsy values.
    Cell: (e) => {
      const v = e.row.original["playerid"];
      if (!v || v === "UNIPIN_VOUCHER")
        return <span className="text-gray-400 w-max">---</span>;
      return copyableCell("Player ID", "playerid")(e);
    },
  },
  {
    Header: "Package name",
    accessor: "name",
    Cell: (e) => {
      const row = e.row.original;
      const pkgName = row["name"];
      const pkgId = row["package_id"];

      // Quantity is DECIMAL out of Sequelize (e.g. "50.00") and can be
      // fractional for dollar-input packages. Show it whenever it differs
      // from a single unit — including values below 1 (e.g. 0.5) which the
      // old `q > 1` gate silently hid. Trim trailing zeros so 50.00 → 50
      // and 2.50 → 2.5.
      const rawQ = Number(e.row.original?.quantity);
      const q = Number.isFinite(rawQ) ? rawQ : 1;
      const qLabel = Number.isInteger(q)
        ? String(q)
        : String(parseFloat(q.toFixed(2)));

      return (
        <p
          className="w-max cursor-pointer hover:text-blue-600"
          title="Tap to copy package name"
          onClick={() => {
            if (!pkgName) return;
            navigator.clipboard.writeText(String(pkgName));
            toast.info(`Copied package name: ${pkgName}`, toastDefault);
          }}
        >
          {pkgName}
          {q !== 1 ? ` × ${qLabel}` : ""}
        </p>
      );
    },
  },
  {
    Header: "Price",
    accessor: "amount",
  },

  {
    // "UC" column. Resolution order:
    //   1. Shell-mode package → render the package's configured shell
    //      string (these orders never carry a voucher).
    //   2. Voucher-pool orders → render the allocated voucher code(s)
    //      from the joined Voucher row(s).
    //   3. Legacy `uc` field (UniPin / bot path).
    Header: "UC / Voucher",
    accessor: "uc",
    // Wide column so multi-voucher orders (auto-delivery / bulk) can
    // show every code without truncation.
    className: "w-[300px] min-w-[300px]",
    Cell: (e) => {
      const row = e.row.original;
      const pkg = row?.TopupPackage;
      // Shell mode wins — the bot uses the shell string in `code`
      // and fires once per tag (sent in `pacakge`/`package`). No
      // voucher is emitted, so this is the meaningful info to show.
      if (Number(pkg?.is_shell) === 1) {
        const shellText = String(pkg?.shell || "").trim();
        let tagList = [];
        try {
          // const raw = pkg?.tags;
          // if (Array.isArray(raw)) tagList = raw;
          // else if (typeof raw === 'string' && raw.trim().length > 0)
          //     tagList = JSON.parse(raw);
        } catch {
          tagList = [];
        }
        // tagList = (Array.isArray(tagList) ? tagList : [])
        //     .map((v) => String(v == null ? '' : v))
        //     .filter((v) => v.length > 0);
        if (shellText || tagList.length > 0) {
          return (
            <div className="flex flex-wrap gap-1 min-w-[300px]">
              {shellText && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold text-xs font-mono cursor-pointer hover:bg-purple-200 break-all whitespace-normal"
                  title="Shell value — click to copy"
                  onClick={() => {
                    navigator.clipboard.writeText(shellText);
                    toast.info(`Copied shell: ${shellText}`, toastDefault);
                  }}
                >
                  {shellText}
                </span>
              )}
              {tagList.map((tag, idx) => (
                <span
                  key={`tag-${idx}-${tag}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs font-mono cursor-pointer hover:bg-indigo-200 break-all whitespace-normal"
                  title="Tag — click to copy"
                  onClick={() => {
                    navigator.clipboard.writeText(tag);
                    toast.info(`Copied tag: ${tag}`, toastDefault);
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          );
        }
      }
      // hasMany on Order → Voucher returns `Vouchers: []`. Fall back to
      // the legacy hasOne shape (`Voucher: {…}`) so older payloads still
      // render correctly.
      const allVouchers = Array.isArray(row?.Vouchers)
        ? row.Vouchers
        : row?.Voucher
          ? [row.Voucher]
          : [];

      const list = allVouchers.filter((v) => Number(v.is_used) !== 2); // Do not show consumed vouchers

      if (list.length > 0) {
        return (
          <div className="flex flex-wrap gap-1 min-w-[300px]">
            {list.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-xs font-mono cursor-pointer hover:bg-green-200 break-all whitespace-normal"
                title="Click to copy voucher"
                onClick={() => {
                  navigator.clipboard.writeText(String(v.data));
                  toast.info(`Copied voucher: ${v.data}`, toastDefault);
                }}
              >
                {v.data}
              </span>
            ))}
          </div>
        );
      }

      const uc = row?.uc;
      if (uc === null || uc === undefined || uc === "") {
        if (allVouchers.length > 0 && list.length === 0) {
          return (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold text-xs uppercase italic"
              title="Voucher was reported as already consumed at the source"
            >
              Consumed
            </span>
          );
        }
        return <span className="text-gray-400">---</span>;
      }
      return uc;
    },
  },
  {
    Header: "Created at",
    accessor: "created_at",
  },
  {
    Header: "Details",
    accessor: "details",
    Cell: (e) => {
      const row = e.row.original;
      const val = row["details"];
      const dispatches = row?.BotDispatches || row?.bot_dispatches || [];
      // Cancelled orders are terminal — wallet has already been
      // refunded, so silently re-firing dispatches would risk
      // double-delivery. Admin must reopen via the status modal
      // before retry becomes available again.
      const isCancelled = row?.status === "cancel";
      const retryable =
        !isCancelled && Array.isArray(dispatches)
          ? dispatches.filter(
              (d) => d.status === "failed" && Number(d.attempt_count || 0) < 5,
            ).length
          : 0;
      if (!val && retryable === 0)
        return <span className="text-gray-400">---</span>;
      return (
        <button
          className="cstm_btn_small !bg-gray-600 hover:!bg-gray-700"
          onClick={() => {
            const Swal = require("sweetalert2").default;
            // Per-dispatch failure list is already baked into
            // `order.details` HTML server-side by checkOrder /
            // retryBotDispatches via buildOrderDetailsHtml.
            // When at least one dispatch is retryable we show
            // a Retry button alongside Close.
            Swal.fire({
              title: "Order Details (Internal)",
              html: `<div style="text-align:left; font-size:14px;">${val || "<em>No details available.</em>"}</div>`,
              icon: "info",
              showCancelButton: retryable > 0,
              confirmButtonText:
                retryable > 0
                  ? `Retry ${retryable} failed dispatch${retryable === 1 ? "" : "es"}`
                  : "Close",
              cancelButtonText: "Close",
              confirmButtonColor: retryable > 0 ? "#2563eb" : undefined,
            }).then(async (result) => {
              // Confirm = Retry. Cancel/dismiss = just close.
              if (!result.isConfirmed || retryable === 0) return;
              try {
                const axiosInstance = require("../common/axios").default;
                const res = await axiosInstance.post(
                  "/admin/orders/bot-retry",
                  { order_ids: [row.id] },
                );
                const summary = res?.data?.data?.[0] || {};
                toast.success(
                  `Retried ${summary.retried || 0} dispatch(es) — ` +
                    `${summary.sent || 0} sent, ${summary.still_failed || 0} still failed`,
                  toastDefault,
                );
                onAfterRetry();
              } catch (err) {
                const { getErrors } = require("./handler.utils");
                toast.error(getErrors(err, false, true), toastDefault);
              }
            });
          }}
        >
          Details{retryable > 0 ? ` · ${retryable}↻` : ""}
        </button>
      );
    },
  },
  {
    Header: "Status",
    accessor: "status",
    Cell: (e) => <Badge type={e.row.original["status"]} />,
  },
  {
    Header: "User id",
    accessor: "user_id",
    Cell: copyableCell("User ID", "user_id"),
  },
];

export const ordersTableColumns = makeOrdersTableColumns();

export const tournametnsTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Image",
    accessor: "image",
    Cell: (e) => <img src={imgPath(e.value)} style={{ maxWidth: "100px" }} />,
  },
  {
    Header: "Title",
    accessor: "title",
  },
  {
    Header: "Start time",
    accessor: "start_time",
    Cell: (e) => moment(e.value).format("DD/MM/Y [at] hh:mm A"),
  },
  {
    Header: "Per kill",
    accessor: "per_kill",
  },
  {
    Header: "Version",
    accessor: "version",
  },
  {
    Header: "Entry fee",
    accessor: "entry_fee",
  },
  {
    Header: "Map",
    accessor: "map",
  },
  {
    Header: "Live link",
    accessor: "live_link",
    Cell: ({ value }) => (
      <a
        href={value}
        target="_blank"
        className="!text-blue-500 hover:!text-blue-600 hover:underline"
      >
        {value}
      </a>
    ),
  },
  {
    Header: "Type",
    accessor: "type",
  },
  // {
  //     Header: 'Prize',
  //     accessor: 'prize',
  //     Cell: (e) => typeof e.value == 'string' ? parse(e.value) : '---'
  // },
  {
    Header: "Rules",
    accessor: "rules",
    Cell: (e) => (typeof e.value == "string" ? parse(e.value) : "---"),
  },
  {
    Header: "Room details",
    accessor: "room_details",
  },
  {
    Header: "Status",
    accessor: "status",
    Cell: (e) => <Badge type={e.row.original["status"]} />,
  },
  {
    Header: "User limit",
    accessor: "user_limit",
  },
  {
    Header: "Created at",
    accessor: "created_at",
  },
  {
    Header: "Updated at",
    accessor: "updated_at",
  },
];

export const tournametnPlayersColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Game name",
    accessor: "game_name",
  },
  {
    Header: "Title",
    accessor: "title",
  },
  {
    Header: "Kills",
    accessor: "kills",
    Cell: (e) => <PlayerKillEditForm {...e} />,
  },
  {
    Header: "Ranking",
    accessor: "ranking",
    Cell: (e) => <PlayerRankingEditForm {...e} />,
  },
  {
    Header: "User Id",
    accessor: "user_id",
  },
];

export const authsTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Slug",
    accessor: "slug",
  },
  {
    Header: "Description",
    accessor: "description",
  },
  {
    Header: "Status",
    accessor: "status",
  },
  {
    Header: "Auth URL",
    accessor: "auth_url",
  },
];

export const adminsTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "First Name",
    accessor: "first_name",
  },
  {
    Header: "Last Name",
    accessor: "last_name",
  },
  {
    Header: "Username",
    accessor: "username",
  },
  {
    Header: "Gender",
    accessor: "gender",
  },
  {
    Header: "Date of birth",
    accessor: "date_of_birth",
  },
  {
    Header: "Image",
    accessor: "image",
  },
  {
    Header: "Email",
    accessor: "email",
  },
  {
    Header: "Phone",
    accessor: "phone",
  },
];

export const uPinsTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Voucher",
    accessor: "code",
  },
  {
    Header: "Status",
    accessor: "status",
  },
  {
    Header: "Package Id",
    accessor: "package_id",
  },
  {
    Header: "User Id",
    accessor: "user_id",
  },
];

export const botTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Status",
    accessor: "status",
  },
  {
    Header: "Bot Server",
    accessor: "ip_url",
  },
  {
    Header: "Total Order",
    accessor: "total_order",
  },
];

export const withdrawEarnWalletTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "User Id",
    accessor: "user_id",
  },
  {
    Header: "Payment",
    accessor: "payment_method",
  },
  {
    Header: "Amount",
    accessor: "amount",
  },
  {
    Header: "Number",
    accessor: "number",
  },
  {
    Header: "Status",
    accessor: "status",
  },
  // {
  //     Header: 'Transaction id',
  //     accessor: 'transaction_id',
  // },
  {
    Header: "Created at",
    accessor: "created_at",
  },
  {
    Header: "Updated at",
    accessor: "updated_at",
  },

  // {
  //     Header: 'Purpose',
  //     accessor: 'purpose',
  // },
];

export const adminTransactionsTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Admin Id",
    accessor: "Admin.first_name",
  },
  {
    Header: "Amount",
    accessor: "amount",
  },
  {
    Header: "Number",
    accessor: "number",
  },
  {
    Header: "Status",
    accessor: "status",
  },
  {
    Header: "Created at",
    accessor: "created_at",
  },
  {
    Header: "Updated at",
    accessor: "updated_at",
  },
];

export const transactionsTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "User Id",
    accessor: "user_id",
  },
  {
    Header: "Payment",
    accessor: "payment_method_name",
  },
  {
    Header: "Amount",
    accessor: "amount",
  },
  {
    Header: "Number",
    accessor: "number",
  },
  {
    Header: "Status",
    accessor: "status",
  },
  {
    Header: "Action By",
    accessor: (originalRow, index) => {
      if (!originalRow.Admin) {
        return "---";
      }
      return originalRow.Admin?.first_name + " " + originalRow.Admin?.last_name;
    },
  },
  {
    Header: "Created at",
    accessor: "created_at",
  },
  {
    Header: "Updated at",
    accessor: "updated_at",
  },

  // {
  //     Header: 'Purpose',
  //     accessor: 'purpose',
  // },
];

export const paymentMethodTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Logo",
    accessor: "logo_full_url",
    Cell: (e) => {
      return <img src={e.value} alt="" width={50} />;
    },
  },
  {
    Header: "Information",
    accessor: "info",
  },
  {
    Header: "Status",
    accessor: "status",
  },
];

export const noticeTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  // Image — only meaningful for type=normal; renders blank for strips.
  {
    Header: "Image",
    accessor: "image_full_url",
    Cell: (e) => {
      const src = e.row.original?.image;
      if (!src) return <span className="text-gray-400">---</span>;
      return <img src={e.value} alt="" width={50} />;
    },
  },
  {
    Header: "Link",
    accessor: "link",
    Cell: (e) => {
      const v = e.row.original?.link;
      if (!v) return <span className="text-gray-400">---</span>;
      return v;
    },
  },
  {
    Header: "Notice",
    accessor: "notice",
    // Notice may contain HTML now; strip tags for a compact preview so
    // the table stays scannable.
    Cell: (e) => {
      const v = String(e.row.original?.notice || "");
      const plain = v
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return (
        <span title={plain}>
          {plain.length > 80 ? plain.slice(0, 80) + "…" : plain}
        </span>
      );
    },
  },
  {
    Header: "Is Active",
    accessor: "is_active",
  },
];

export const tutorialTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Title",
    accessor: "title",
  },
  {
    Header: "Video link",
    accessor: "video_link",
    Cell: (e) => {
      const v = e.row.original?.video_link;
      if (!v) return <span className="text-gray-400">---</span>;
      return (
        <a
          href={v}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {v}
        </a>
      );
    },
  },
  {
    Header: "Serial",
    accessor: "serial",
  },
  {
    Header: "Active",
    accessor: "is_active",
    Cell: (e) => {
      const v = Number(e.row.original?.is_active) === 1;
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
        >
          {v ? "Active" : "Inactive"}
        </span>
      );
    },
  },
];

export const bannerTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Note",
    accessor: "note",
  },
  {
    Header: "Link",
    accessor: "link",
  },
  {
    Header: "Image",
    accessor: "banner_full_url",
    Cell: (e) => {
      return <img src={e.value} alt="" width={50} />;
    },
  },

  {
    Header: "Is Active",
    accessor: "isactive",
  },
];

export const userTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Username",
    accessor: "username",
  },
  {
    Header: "Account status",
    accessor: "account_status",
  },
  {
    Header: "Is banned",
    accessor: "is_banned",
  },
  {
    Header: "Avatar",
    accessor: "avatar",
    Cell: (e) => {
      return <img src={e.value} alt="" width={50} />;
    },
  },
  {
    Header: "Phone",
    accessor: "phone",
  },
  {
    Header: "Email",
    accessor: "email",
  },
  {
    Header: "Wallet",
    accessor: "wallet",
  },
  {
    Header: "Earn wallet",
    accessor: "earn_wallet",
  },
  {
    Header: "Scores",
    accessor: "scores",
  },
  {
    Header: "Provider",
    accessor: "provider",
  },
  {
    Header: "Is phone verify",
    accessor: "is_phone_verify",
  },
  {
    Header: "Created at",
    accessor: "created_at",
  },
];

export const productTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Serial",
    accessor: "serial",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Logo",
    accessor: "logo_full_url",
    Cell: (e) => {
      return (
        <img
          src={e.value}
          alt=""
          width={50}
          className="bg-gray-300 min-h-[60px]"
        />
      );
    },
  },
];

export const physicalProductTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Image",
    accessor: "image_full_url",
    Cell: (e) => {
      return (
        <img
          src={e.value}
          alt="Img"
          style={{ minWidth: "60px", maxWidth: "60px", objectFit: "cover" }}
          className="bg-gray-300 min-h-[60px]"
        />
      );
    },
  },
  {
    Header: "Sale Price",
    accessor: "sale_price",
  },
  {
    Header: "Regular Price",
    accessor: "regular_price",
  },
  {
    Header: "Description",
    accessor: "description",
    Cell: (e) => {
      return <ProductDescriptionSeeMore text={e.value} />;
    },
  },
  {
    Header: "Is Active",
    accessor: "is_active",
  },
  {
    Header: "Created at",
    accessor: "created_at",
  },
];

export const packageTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Product",
    accessor: "product_id",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Sale price",
    accessor: "price",
  },
  {
    Header: "Buy price",
    accessor: "bprice",
  },
  {
    Header: "Serial",
    accessor: "serial",
  },
  {
    Header: "Logo",
    accessor: "logo",
    Cell: (e) => {
      return <img src={imgPath(e.value)} alt="" width={50} />;
    },
  },
];

export const completedOrderByAdminsTableColumns = [
  {
    Header: "Name",
    accessor: "username",
    Cell: (e) => {
      let data = e.row.original;
      return (
        <span style={{ textTransform: "capitalize" }}>
          {data.first_name + " " + data.last_name}
        </span>
      );
    },
  },
  {
    Header: "Today",
    accessor: "id",
    Cell: (e) => {
      return e.row.original?.today_order || "---";
    },
  },
  {
    Header: "Total",
    accessor: "first_name",
    Cell: (e) => {
      return e.row.original?.total_order || "---";
    },
  },
  {
    Header: "Wallet",
    Cell: (e) => {
      return e.row.original?.wallet || "---";
    },
  },
];

export const physicalProductOrderTableColumns = [
  {
    Header: "Id",
    accessor: "id",
  },
  {
    Header: "Product id",
    Cell: (e) => e.row.original["product_id"],
  },
  {
    Header: "Product name",
    Cell: (e) => e.row.original["Product.name"],
  },
  {
    Header: "Image",
    Cell: (e) => (
      <img
        style={{ width: "60px" }}
        src={imgPath(e.row.original["Product.image"])}
        alt="Img"
      />
    ),
  },
  {
    Header: "Sale price",
    Cell: (e) => e.row.original["Product.sale_price"],
  },
  {
    Header: "Order Status",
    Cell: (e) => <Badge type={e.row.original["status"]} />,
  },
  {
    Header: "User id",
    Cell: (e) => e.row.original["user_id"],
  },
  {
    Header: "Username",
    Cell: (e) => e.row.original["User.username"],
  },
  {
    Header: "Phone",
    Cell: (e) => e.row.original["User.phone"],
  },
  {
    Header: "Email",
    Cell: (e) => e.row.original["User.email"],
  },
];
