import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { adminRequest } from '../api-client/adminUsers';
import type { Catalog, DirectoryEntry } from '../api-client/adminUsers';
import './AdminDirectoryView.css';

type Kind = 'departments' | 'positions';
type Editor = { kind: Kind; entry?: DirectoryEntry };
const labels: Record<Kind, string> = { departments: 'phòng ban', positions: 'chức danh' };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể thực hiện thao tác. Vui lòng thử lại.';

export function AdminDirectoryView() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let current = true;
    adminRequest<Catalog>('/directory').then(data => { if (current) setCatalog(data); })
      .catch(error => { if (current) setError(errorText(error)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);

  function reload() { setLoading(true); setError(''); setRevision(value => value + 1); }
  function openEditor(kind: Kind, button: HTMLButtonElement, entry?: DirectoryEntry) {
    opener.current = button;
    setEditor({ kind, entry }); setFormError(''); setMessage('');
    dialog.current?.showModal();
  }
  function closeEditor() { dialog.current?.close(); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || saving) return;
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') ?? '').trim();
    if (!name) { setFormError('Tên không được để trống.'); return; }
    const code = editor.entry?.code ?? String(values.get('code') ?? '');
    setSaving(true); setFormError(''); setError(''); setMessage('');
    try {
      await adminRequest(`/directory/${editor.kind}${editor.entry ? `/${editor.entry.id}` : ''}`,
        { code, name, isActive: editor.entry?.isActive ?? true }, editor.entry ? 'PUT' : 'POST');
      closeEditor(); setMessage(editor.entry ? 'Đã đổi tên danh mục.' : 'Đã thêm danh mục.'); reload();
    } catch (error) { setFormError(errorText(error)); }
    finally { setSaving(false); }
  }

  async function toggle(kind: Kind, entry: DirectoryEntry) {
    if (saving || !window.confirm(`${entry.isActive ? 'Ngừng sử dụng' : 'Kích hoạt'} ${labels[kind]} “${entry.name}”? Các phân công hiện có được giữ nguyên.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await adminRequest(`/directory/${kind}/${entry.id}`, { ...entry, isActive: !entry.isActive }, 'PUT');
      setMessage('Đã cập nhật trạng thái danh mục.'); reload();
    } catch (error) { setError(errorText(error)); }
    finally { setSaving(false); }
  }

  return <div className="directory-page">
    <header className="directory-heading"><h1>Phòng ban & chức danh</h1><p>Quản lý danh mục phòng ban và chức danh dùng cho phân công nhân sự.</p></header>
    {message && <p className="directory-success" role="status">{message}</p>}
    {error && <div className="directory-error" role="alert">{error} <button disabled={loading || saving} onClick={reload}>Thử lại</button></div>}
    {loading && <p role="status">Đang tải danh mục…</p>}
    {(['departments', 'positions'] as const).map(kind => <section key={kind} aria-labelledby={`${kind}-title`} aria-busy={loading}>
      <div className="directory-section-heading"><h2 id={`${kind}-title`}>{kind === 'departments' ? 'Phòng ban' : 'Chức danh'}</h2>
        <button className="directory-primary" disabled={loading || saving || !catalog} onClick={event => openEditor(kind, event.currentTarget)}>Thêm {labels[kind]}</button></div>
      <div className="directory-table-wrap" role="region" aria-label={`Danh sách ${labels[kind]}`} tabIndex={0}><table>
        <caption>{catalog ? `${catalog[kind].length} ${labels[kind]}` : `Danh sách ${labels[kind]}`}</caption>
        <thead><tr><th scope="col">Mã</th><th scope="col">Tên</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
        <tbody>{catalog?.[kind].map(entry => <tr key={entry.id}>
          <td><code>{entry.code}</code></td><td>{entry.name}</td>
          <td><span className={`directory-status${entry.isActive ? ' is-active' : ''}`}>{entry.isActive ? 'Hoạt động' : 'Ngừng sử dụng'}</span></td>
          <td><div className="directory-actions"><button disabled={saving || loading} aria-label={`Đổi tên ${entry.name}`} onClick={event => openEditor(kind, event.currentTarget, entry)}>Đổi tên</button>
            <button disabled={saving || loading} aria-label={`${entry.isActive ? 'Ngừng sử dụng' : 'Kích hoạt'} ${entry.name}`} onClick={() => void toggle(kind, entry)}>{entry.isActive ? 'Ngừng sử dụng' : 'Kích hoạt'}</button></div></td>
        </tr>)}</tbody>
      </table></div>
      {catalog && !catalog[kind].length && <p className="directory-empty">Chưa có {labels[kind]}. Chọn “Thêm {labels[kind]}” để tạo mục đầu tiên.</p>}
    </section>)}
    <dialog ref={dialog} className="directory-dialog" aria-labelledby="directory-editor-title" onClose={() => { setEditor(null); opener.current?.focus(); }} onCancel={event => { if (saving) event.preventDefault(); }}>
      {editor && <form key={`${editor.kind}-${editor.entry?.id ?? 'new'}`} onSubmit={save}>
        <div className="directory-section-heading"><h2 id="directory-editor-title">{editor.entry ? 'Đổi tên' : 'Thêm'} {labels[editor.kind]}</h2><button type="button" disabled={saving} onClick={closeEditor}>Đóng</button></div>
        <fieldset disabled={saving}>
          <label>Mã<input name="code" required pattern="[A-Z0-9_]{1,40}" maxLength={40} defaultValue={editor.entry?.code ?? ''} readOnly={!!editor.entry} aria-describedby="directory-code-help" autoFocus={!editor.entry} /></label>
          <p id="directory-code-help" className="directory-help">{editor.entry ? 'Mã được giữ nguyên khi đổi tên.' : 'Từ 1–40 ký tự: chữ in hoa, chữ số hoặc dấu gạch dưới (_).'}</p>
          <label>Tên<input name="name" required maxLength={160} defaultValue={editor.entry?.name ?? ''} autoFocus={!!editor.entry} aria-describedby={formError ? 'directory-form-error' : undefined} /></label>
          {formError && <p id="directory-form-error" className="directory-error" role="alert">{formError}</p>}
          <div className="directory-form-actions"><button type="button" onClick={closeEditor}>Hủy</button><button className="directory-primary" type="submit">{saving ? 'Đang lưu…' : editor.entry ? 'Lưu tên' : 'Thêm mới'}</button></div>
        </fieldset>
      </form>}
    </dialog>
  </div>;
}
