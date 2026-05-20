import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import { ordersTableColumns } from "../../utils/reactTableColumns";
import Table from "../react-table/Table";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import SearchOrder from "./SearchOrder";
import ViewOrderModal from "./ViewOrderModal";

// Escape user-supplied template strings so they're safe to inline as HTML
// attribute values inside the Swal markup (datalist option, etc.).
const escAttr = (s) =>
    String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

function Orders() {
    const [totalDataCount, setTotalDataCount] = useState(null)
    const [savedComments, setSavedComments] = useState([])
    const reloadRefFunc = useRef(null)

    // Pull the saved comment templates once on mount and refresh whenever
    // the admin returns to this page. The dropdown in the edit modal is
    // populated from this list (admin can still type a custom note).
    useEffect(() => {
        let cancelled = false
        axiosInstance
            .get('/admin/order-comments')
            .then((res) => {
                if (cancelled) return
                const list = Array.isArray(res?.data?.data) ? res.data.data : []
                setSavedComments(list)
            })
            .catch(() => { /* the dropdown just stays empty */ })
        return () => { cancelled = true }
    }, [])


    let actionMenu = {
        id: 'edit',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            const order = e.row.original
            const status = order.status
            const canEdit = status === 'pending' || status === 'In Progress'
            const hasPlayerId = !!(order.playerid && order.playerid !== 'UNIPIN_VOUCHER')
            return (
                <ul className="flex space-x-2">
                    {!hasPlayerId && <ViewOrderModal order={order} />}
                    {canEdit && (
                        <li className="cstm_btn_small" onClick={() => openChangeStatusModal(e.value)}>
                            Edit
                        </li>
                    )}
                </ul>
            )
        }
    };
    let withActionMenu = [...ordersTableColumns, actionMenu]


    const openChangeStatusModal = async (order_id) => {

        // Build the saved-comment picker + datalist from the API-loaded list.
        const savedOptions = savedComments
            .map((c) => {
                const label = c.label || (c.plain_text || '').slice(0, 80)
                return `<option value="${escAttr(c.id)}">${escAttr(label)}</option>`
            })
            .join('')
        const dynamicDatalist = savedComments
            .map((c) => `<option value="${escAttr(c.plain_text)}"></option>`)
            .join('')
        const savedPickerHtml = savedComments.length
            ? `<label class="block text-left mb-2">
                    <span class="form_label">Load saved comment</span>
                    <select id="order-saved-comment" class="form_input">
                        <option value="">-- Select a saved comment --</option>
                        ${savedOptions}
                    </select>
                </label>`
            : `<p class="text-xs text-gray-500 mb-2 text-left">No saved comment templates yet — <a href="/order-comments" class="text-blue-600 underline">create one</a> to reuse here.</p>`

        const { value: formValues } = await Swal.fire({
            title: 'Change order status',
            html:
                `<select id="order-status-value" class="form_input w-full mb-4">
                    <option value="completed" style="font-size: 2em;">Completed</option>
                    <option value="pending" selected style="font-size: 2em;">Pending</option>
                    <option value="In Progress" style="font-size: 2em;">In Progress</option>
                    <option value="cancel" style="font-size: 2em;">Cancel</option>
                </select>` +
                savedPickerHtml +
                `
            <label class="block text-left">
                <span class="form_label">Brief Note</span>
                <textarea rows="3" class="mt-1 block w-full form_input" id="order-note" placeholder="Pick a saved comment above or type your own." list="auto_comment"></textarea>
                <datalist id="auto_comment">
                    <option value="আইডি কোড ভুল"></option>
                    <option value="অন্য সার্ভার এর আইডি"></option>
                    <option value="আইডি/পাসওয়ার্ড ভুল"></option>
                    <option value="এই order টি নেই"></option>
                    <option value="আপনার আইডিতে এই order টি নেই"></option>
                </datalist>
            </label>`,
            didOpen: () => {
                const picker = document.getElementById('order-saved-comment')
                const note = document.getElementById('order-note')
                if (!picker || !note) return
                // When the admin picks a saved comment, copy its plain text
                // into the textarea for previewing/editing AND stash the
                // template's HTML on the textarea via a data-attribute. On
                // submit we prefer the HTML if it's still the original
                // template (textarea unchanged), so the client can render
                // formatting like bold / lists / links.
                picker.addEventListener('change', (e) => {
                    const id = e.target.value
                    if (!id) {
                        note.dataset.html = ''
                        note.dataset.plain = ''
                        return
                    }
                    const found = savedComments.find(
                        (c) => String(c.id) === String(id),
                    )
                    if (found) {
                        note.value = found.plain_text || ''
                        note.dataset.html = found.html || ''
                        note.dataset.plain = found.plain_text || ''
                    }
                })
                // If the admin edits the textarea, drop the cached HTML so we
                // fall back to submitting the typed plain text.
                note.addEventListener('input', () => {
                    if (note.value !== note.dataset.plain) {
                        note.dataset.html = ''
                    }
                })
                // Append the dynamic datalist options (built from API data).
                const dl = document.getElementById('auto_comment')
                if (dl) dl.innerHTML += `${dynamicDatalist}`
            },
            focusConfirm: false,
            preConfirm: () => {
                const orderStatus = document.getElementById('order-status-value').value
                const noteEl = document.getElementById('order-note')
                const plain = noteEl.value
                const cachedHtml = noteEl.dataset.html || ''
                // Prefer the saved-template HTML when the textarea is still
                // the unedited plain rendering of it; otherwise send the raw
                // text the admin typed.
                const orderNote = cachedHtml || plain

                if (!orderStatus) {
                    toast.error('Select an order status', toastDefault)
                    return false
                }

                return { orderStatus, orderNote };
            }
        })


        if (formValues) {
            toast.promise(
                axiosInstance.post(`/admin/order/update-order-status/${order_id}`, {
                    status: formValues.orderStatus,
                    order_note: formValues.orderNote
                }),
                {
                    pending: 'Updating order...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            reloadRefFunc.current()
                            return 'Order updated successfully'
                        }
                    }
                },
                toastDefault
            )
        }
    }
    return (
        <div className="md:px-5" >
            <div className="bg-white py-5 mb-5 px-5">
                <Table
                    customGlobalSearch={({ addSearchParam, removeSearchParam }) => (
                        <SearchOrder addSearchParam={addSearchParam} removeSearchParam={removeSearchParam} />
                    )}
                    reloadRefFunc={reloadRefFunc}
                    tableTitle="Product Orders"
                    tableSubTitle={hasData(totalDataCount) && `Total result: ${totalDataCount}`}
                    globalSearchPlaceholder="Product id or user id"
                    tableId="order_table"
                    url="/admin/orders"
                    selectData={(res) => {
                        setTotalDataCount(res.data.data.order_count)

                        return {
                            data: res.data.data.orders,
                            total: res.data.data.order_count,
                        }
                    }}
                    queryString="order_id"
                    disableGlobalSearch
                    selectError={(err) => getErrors(err, true)[0]}
                    columns={withActionMenu}
                />
            </div>
        </div>
    )
}

export default Orders