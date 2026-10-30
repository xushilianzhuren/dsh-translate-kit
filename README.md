# dsh-translate-kit · 翻译工坊

Translation quality kit: **persistent glossary + dual-version translation + back-translation check**, mounted as resident rules plus a glossary tool.

## 常驻纪律
①先查术语表（专有名词不自造译名）②新术语译完即沉淀（同词永远同译·跨会话一致）③重要文案双译对照（直译/意译各一版）④语域对齐（读者是谁决定术语密度）⑤高stakes文案回译自检。

## 工具 `translate_glossary`
| action | 干什么 |
|---|---|
| `查` | 读术语表（可按关键词过滤） |
| `加` | 新增/更新词条（source→target+语境） |
| `删` | 删除词条 |

术语表存 `workspace/glossary.json`（文件名可配），跨会话复用。

## 安装
```
dsh plugin add github:xushilianzhuren/dsh-translate-kit
```
MIT License.
