def explain_transfer(row):
    reasons = []

    if row["gnn_risk_score"] >= 0.9:
        reasons.append({
            "code": "HIGH_GRAPH_RISK",
            "title": "그래프 위험도가 매우 높음",
            "detail": "연결 주소의 거래 행동과 주변 자금 흐름이 위험 패턴과 유사합니다.",
        })
    elif row["gnn_risk_score"] >= 0.7:
        reasons.append({
            "code": "ELEVATED_GRAPH_RISK",
            "title": "그래프 위험도가 높음",
            "detail": "주변 주소 관계에서 추가 확인이 필요한 패턴이 발견됐습니다.",
        })

    if not row["is_self_transfer"]:
        reasons.append({
            "code": "EXTERNAL_RECIPIENT",
            "title": "외부 주소로 전달",
            "detail": "송신 주소와 다른 주소로 자금이 이동했습니다.",
        })

    if row["is_second_largest"]:
        reasons.append({
            "code": "SECOND_LARGEST_OUTPUT",
            "title": "두 번째로 큰 출력",
            "detail": "Bybit 데이터에서 자금세탁 라벨이 자주 나타난 거래 내부 위치입니다.",
        })

    if row["amount_share_in_tx"] <= 0.1:
        reasons.append({
            "code": "SPLIT_OUTPUT",
            "title": "분할 송금",
            "detail": "전체 거래 금액의 10% 이하로 분리된 출력입니다.",
        })

    return reasons


def explain_case(group, top_transfer):
    evidence = [{
        "code": "GNN_PRIORITY",
        "title": "GNN 조사 우선순위",
        "detail": (
            "거래 내 최고 위험 점수는 "
            f"{top_transfer['gnn_risk_score']:.3f}입니다."
        ),
    }]

    transfer_count = int(group["tx_transfer_count"].iloc[0])
    if transfer_count >= 5:
        evidence.append({
            "code": "MULTI_OUTPUT",
            "title": "다중 출력 거래",
            "detail": f"한 거래에서 {transfer_count}개의 송금 출력이 생성됐습니다.",
        })

    external_share = float(
        group["external_amount_share_in_tx"].iloc[0]
    )
    if external_share >= 0.8:
        evidence.append({
            "code": "HIGH_EXTERNAL_SHARE",
            "title": "외부 전달 비율이 높음",
            "detail": f"거래 금액의 {external_share:.1%}가 외부 주소로 전달됐습니다.",
        })

    evidence.append({
        "code": "LOCATOR_TARGET",
        "title": "우선 조사 대상 특정",
        "detail": f"수신 주소 {top_transfer['toaddress']}를 가장 먼저 확인해야 합니다.",
    })

    return evidence
