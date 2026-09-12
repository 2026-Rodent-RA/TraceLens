from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from evaluation import (
    evaluate_classification,
    evaluate_ranking,
    evaluate_transaction_ranking,
    find_best_threshold,
)

from bybit_data import (
    FEATURE_COLUMNS,
    PROJECT_DIR,
    prepare_data,
)


def main():

    train, validation, test = prepare_data()

    
    X_train = train[FEATURE_COLUMNS]
    y_train = train["label"]

    X_validation = validation[FEATURE_COLUMNS]
    y_validation = validation["label"]

    X_test = test[FEATURE_COLUMNS]
    y_test = test["label"]

    print("=== 데이터 크기 ===")
    print("train:", len(train))
    print("validation:", len(validation))
    print("test:", len(test))

    print("\n=== 사용 특징 ===")
    for feature in FEATURE_COLUMNS:
        print("-", feature)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    validation_probabilities = model.predict_proba(
        X_validation
    )[:, 1]

    best_threshold, validation_f1 = find_best_threshold(
        y_validation,
        validation_probabilities,
    )

    print(
        "\n검증 데이터에서 선택한 임계값:",
        f"{best_threshold:.2f}",
    )
    print(
        "검증 F1:",
        f"{validation_f1:.4f}",
    )

    test_probabilities = model.predict_proba(
        X_test
    )[:, 1]

    evaluate_classification(
        "Validation",
        y_validation,
        validation_probabilities,
        best_threshold,
    )

    evaluate_classification(
        "Test",
        y_test,
        test_probabilities,
        best_threshold,
    )

    importance = pd.Series(
        model.feature_importances_,
        index=FEATURE_COLUMNS,
    ).sort_values(ascending=False)

    print("\n=== 특징 중요도 ===")
    print(importance)


    ranked_test = evaluate_ranking(
        test,
        test_probabilities,
    )

    evaluate_transaction_ranking(
        test,
        test_probabilities,
    )

    OUTPUT_DIR = PROJECT_DIR / "ml" / "outputs"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    ranked_test["rank"] = np.arange(1, len(ranked_test) + 1)

    ranked_test.head(1000).to_csv(
        OUTPUT_DIR / "rf_bybit_top1000.csv",
        index=False,
    )

    print(
        "\n조사 우선순위 저장:",
        OUTPUT_DIR / "rf_bybit_top1000.csv",
    )


if __name__ == "__main__":
    main()