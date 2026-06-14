import React, { useCallback, useMemo, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// This editor used to be built on react-draft-wysiwyg + draft-js. draft-js
// 0.11 has a long-standing Android/IME defect: committing a word via the
// space bar or a predictive-text suggestion drops the just-typed text and
// throws a React synthetic-event warning, blanking the editor on mobile.
// We swapped the engine for Quill (react-quill), which handles mobile
// composition correctly, while keeping the exact same props contract
// (`value` HTML in, `onHtmlChange`/`onChange` HTML out, `minHeight`, etc.)
// so none of the ~15 call sites need to change.

// Backward-compat shim: callers used to convert a draft-js EditorState to
// HTML through this helper. The editor is HTML-native now, so a string just
// passes through. Kept exported so any stray importer keeps working.
export function editorStateToHtml(state) {
    return typeof state === 'string' ? state : '';
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Per-instance counter so we can scope the min-height CSS rule to one editor
// without it leaking onto sibling editors on the same page.
let _uid = 0;

function TextEditor({
    value,
    onChange,
    onHtmlChange,
    placeholder,
    minHeight = 220,
    wrapperStyle,
    editorStyle,
    onUploadImage,
    disabled,
    className,
}) {
    const quillRef = useRef(null);
    const scopeClass = useMemo(() => `te-quill-${++_uid}`, []);

    const emit = useCallback(
        (html) => {
            // Quill emits "<p><br></p>" for an empty editor; normalise to ""
            // so the old "is this blank?" checks downstream (e.g. the
            // storefront's hasDescription) keep behaving the same.
            const normalised = html === '<p><br></p>' ? '' : html;
            onChange && onChange(normalised);
            onHtmlChange && onHtmlChange(normalised);
        },
        [onChange, onHtmlChange],
    );

    // Image button: inline the picked file as a base64 data URL so the
    // editor works without a separate upload pipeline (matches the old
    // defaultUploadImage behaviour). Callers can pass
    // `onUploadImage(file) => { data: { link } }` to swap in a real upload.
    const imageHandler = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute(
            'accept',
            'image/jpeg,image/jpg,image/png,image/gif,image/webp',
        );
        input.click();
        input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            let link;
            try {
                if (onUploadImage) {
                    const res = await onUploadImage(file);
                    link = res?.data?.link;
                } else {
                    link = await readFileAsDataURL(file);
                }
            } catch (e) {
                return;
            }
            if (!link) return;
            const editor = quillRef.current && quillRef.current.getEditor();
            if (!editor) return;
            const range = editor.getSelection(true);
            const index = range ? range.index : editor.getLength();
            editor.insertEmbed(index, 'image', link, 'user');
            editor.setSelection(index + 1, 0);
        };
    }, [onUploadImage]);

    // Toolbar mirrors the formatting the old draft-js toolbar exposed:
    // headings/size, inline styles, text + background colour, lists,
    // alignment, links, images, and a clear-formatting button.
    const modules = useMemo(
        () => ({
            toolbar: {
                container: [
                    [{ header: [1, 2, 3, false] }],
                    [{ size: ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ color: [] }, { background: [] }],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    [{ align: [] }],
                    ['link', 'image'],
                    ['clean'],
                ],
                handlers: { image: imageHandler },
            },
            // Don't copy the source's visual background/inline styles wholesale
            // on paste — keeps pasted content from carrying stray spans.
            clipboard: { matchVisual: false },
        }),
        [imageHandler],
    );

    const formats = [
        'header',
        'size',
        'bold',
        'italic',
        'underline',
        'strike',
        'color',
        'background',
        'list',
        'bullet',
        'align',
        'link',
        'image',
    ];

    return (
        <div
            className={className}
            style={{
                border: '1px solid #dcdcf3',
                borderRadius: 6,
                ...wrapperStyle,
            }}
        >
            <style>{`.${scopeClass} .ql-editor{min-height:${minHeight}px}`}</style>
            <ReactQuill
                ref={quillRef}
                className={scopeClass}
                theme="snow"
                value={value || ''}
                onChange={emit}
                placeholder={placeholder}
                readOnly={!!disabled}
                modules={modules}
                formats={formats}
                style={editorStyle}
            />
        </div>
    );
}

export default TextEditor;
