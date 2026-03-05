# 输出模板（双模板）

## 模板 1：给人看的问题摘要（Markdown）

```markdown
## 问题摘要（Human Summary）
- 问题：一句话描述异常现象
- 严重级别：high / medium / low
- 影响范围：受影响页面或模块
- 复现关键点：触发动作 + 输入条件
- 根因结论：一句话说明主因
- 修复建议：推荐方案一句话
```

## 模板 2：给 AI Agent 的交接 YAML

```yaml
report_version: "1.0"
report_type: "ai_handoff_bug_report"
language: "zh-CN"

task_id: "bug-xxx-001"
title: "问题标题"
severity: "high"
confidence: 0.90
status: "confirmed"

objective_for_next_agent:
  - "先判断本报告内容是否属实、修复方案是否合理"
  - "若内容属实且方案合理，可直接实施代码修复"
  - "若任一项不合理，先提出异议与替代方案，等待用户确认后再改代码"

scope:
  include_paths:
    - "ABS_PATH_1"
  exclude_paths:
    - "非相关模块"

problem_definition:
  expected_behavior: "期望行为"
  actual_behavior: "实际行为"
  trigger_conditions:
    - "触发条件1"
  impact:
    - "影响1"

reproduction:
  preconditions:
    - "前置条件1"
  steps:
    - "步骤1"
    - "步骤2"
  expected: "预期结果"
  actual: "实际结果"

root_cause:
  summary: "根因摘要"
  causal_chain:
    - "触发 -> 路径 -> 状态变化 -> 异常"
  evidence:
    - file: "ABS_PATH_FILE"
      line: 1
      snippet_desc: "证据说明"

fix_recommendations:
  preferred_plan:
    id: "plan-a"
    actions:
      - "推荐动作1"
    rationale: "推荐原因"
  alternative_plan:
    id: "plan-b"
    actions:
      - "备选动作1"
    rationale: "备选原因"

constraints_for_next_agent:
  - "约束1"

decision_gate_for_next_agent:
  required_checks:
    - "核验复现步骤能否稳定复现"
    - "核验根因链路与代码证据是否一致"
    - "核验推荐方案是否有明显副作用"
  execution_rule:
    - "三项检查均通过 -> 可直接修复"
    - "任一检查不通过 -> 输出异议点+替代方案，并等待用户确认"

acceptance_tests:
  - id: "AT-1"
    case: "验收用例1"
    pass_criteria: "通过标准1"

deliverables_required:
  - "变更文件清单"
  - "关键改动说明（按文件）"
  - "验收用例执行结果"
  - "潜在回归风险"

