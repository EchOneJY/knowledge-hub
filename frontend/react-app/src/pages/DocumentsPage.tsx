import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Checkbox, Input, Popconfirm, Select, Space, Table, Tag, Upload, message } from 'antd'
import { documentApi } from '../api'
import { ApiError } from '../api/client'
import type { DocumentItem } from '../types'
import { useAuth } from '../auth'
import { DOC_STATUS, can, canWriteDocument, formatTime, visibilityMeta } from '../utils'
import { FileTypeIcon, fileTypeLabel } from '../components/FileTypeIcon'

export default function DocumentsPage() {
  const user = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [mineOnly, setMineOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const pageSize = 10

  async function load(nextPage = page) {
    setLoading(true)
    try {
      const res = await documentApi.list({
        page: nextPage,
        pageSize,
        title: title.trim() || undefined,
        status,
        authorId: mineOnly ? user?.userId : undefined,
      })
      setItems(res.items)
      setTotal(res.total)
      setPage(nextPage)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1)
  }, [])

  return (
    <div className="kh-page">
      <p className="kh-access-hint">
        列表只展示你能看的文档：公开、所在团队，以及自己写的。编辑 / 发布仅作者或管理员可用。
      </p>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="标题搜索"
          style={{ width: 240 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPressEnter={() => void load(1)}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 140 }}
          value={status}
          onChange={setStatus}
          options={Object.entries(DOC_STATUS).map(([k, v]) => ({
            value: Number(k),
            label: v.label,
          }))}
        />
        <Checkbox
          checked={mineOnly}
          onChange={(e) => setMineOnly(e.target.checked)}
        >
          仅我的
        </Checkbox>
        <Button onClick={() => void load(1)}>查询</Button>
        {can(user, 'document:create') ? (
          <>
            <Button type="primary" onClick={() => navigate('/documents/new')}>
              新建文档
            </Button>
            <Upload
              showUploadList={false}
              beforeUpload={async (file) => {
                const form = new FormData()
                form.append('file', file)
                try {
                  const res = await documentApi.uploadParse(form)
                  message.success('已解析为草稿，可在编辑页设置公开或团队')
                  navigate(`/documents/${res.documentId}/edit`)
                } catch (error) {
                  message.error(error instanceof ApiError ? error.message : '上传失败')
                }
                return false
              }}
            >
              <Button>上传解析</Button>
            </Upload>
          </>
        ) : null}
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        pagination={{ current: page, pageSize, total, onChange: (p) => void load(p) }}
        columns={[
          {
            title: '标题',
            dataIndex: 'title',
            render: (value: string, row: DocumentItem) => (
              <a
                onClick={() => navigate(`/documents/${row.id}`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <FileTypeIcon name={row.title} />
                {value}
              </a>
            ),
          },
          {
            title: '摘要',
            dataIndex: 'summary',
            width: 220,
            ellipsis: true,
            render: (summary?: string | null) => summary || '-',
          },
          {
            title: '文件类型',
            width: 100,
            // 优先用后端持久化的文件类型;历史/手写文档回退按标题推断
            render: (_: unknown, row: DocumentItem) =>
              row.fileType ? row.fileType.toUpperCase() : fileTypeLabel(row.title),
          },
          {
            title: '所属团队',
            dataIndex: 'teamName',
            width: 140,
            render: (teamName?: string | null) => teamName || '-',
          },
          {
            title: '作者',
            dataIndex: 'authorName',
            width: 120,
            render: (authorName?: string | null) => authorName || '-',
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: number) => <Tag color={DOC_STATUS[s]?.color}>{DOC_STATUS[s]?.label}</Tag>,
          },
          {
            title: '可见性',
            width: 110,
            render: (_: unknown, row: DocumentItem) => {
              const vis = visibilityMeta(row)
              return <Tag color={vis.color}>{vis.label}</Tag>
            },
          },
          { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: formatTime },
          {
            title: '操作',
            width: 220,
            align: 'center' as const,
            render: (_: unknown, row: DocumentItem) => {
              const writable = can(user, 'document:edit') && canWriteDocument(user, row)
              return (
                <Space>
                  {row.fileUrl ? (
                    <>
                      {/* 原文件在 RustFS 公开地址:预览新标签打开,下载走 a[download] 兜底 */}
                      <a onClick={() => window.open(row.fileUrl!, '_blank')}>预览</a>
                      <a
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = row.fileUrl!
                          a.download = ''
                          a.target = '_blank'
                          a.click()
                        }}
                      >
                        下载
                      </a>
                    </>
                  ) : null}
                  {writable ? (
                    <a onClick={() => navigate(`/documents/${row.id}/edit`)}>编辑</a>
                  ) : null}
                  {writable && row.status === 0 ? (
                    <a
                      onClick={async () => {
                        try {
                          await documentApi.publish(row.id)
                          message.success('已提交发布')
                          void load()
                        } catch (error) {
                          message.error(error instanceof ApiError ? error.message : '发布失败')
                        }
                      }}
                    >
                      发布
                    </a>
                  ) : null}
                  {/* 仅已归档(status===2)文档可删除:需 delete 权限且为作者/管理员 */}
                  {can(user, 'document:delete') && canWriteDocument(user, row) && row.status === 2 ? (
                    <Popconfirm
                      title="删除文档"
                      description="此操作不可恢复，确定删除?"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={async () => {
                        try {
                          await documentApi.remove(row.id)
                          message.success('已删除')
                          void load()
                        } catch (error) {
                          message.error(error instanceof ApiError ? error.message : '删除失败')
                        }
                      }}
                    >
                      <a>删除</a>
                    </Popconfirm>
                  ) : null}
                </Space>
              )
            },
          },
        ]}
      />
    </div>
  )
}
