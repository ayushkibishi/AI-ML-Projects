Credit Risk Scoring Using Alternative Data

📌 Project Overview

Traditional credit scoring systems rely on financial history such as CIBIL score, bank statements, and income proof.  
However, many individuals like students, freelancers, and first-time borrowers lack this information.

This project builds a **machine learning–based credit risk scoring system** using **alternative data**, such as:

- Behavioral patterns  
- Mobile usage behavior  
- Transaction habits  
- Social indicators  

The model predicts the **probability of loan default** and generates a **credit risk score**.



🎯 Objective

- Predict whether a customer is likely to default on a loan  
- Use non-traditional data instead of banking records  
- Generate a numerical credit score for risk assessment  



🧠 Machine Learning Type

**Binary Classification**

- `0` → Low Risk (Good Customer)  
- `1` → High Risk (Default Risk)  



📊 Alternative Data Features

| Feature | Description |
|------|------|
| app_usage_hours | Average daily smartphone usage |
| monthly_transactions | Number of monthly digital transactions |
| avg_transaction_value | Average transaction amount |
| social_connections | Number of social contacts |
| late_night_activity | Percentage of usage after midnight |
| device_price | Approximate mobile device value |
| location_stability | Days stayed in same city |
| previous_loan | Previous loan history (0/1) |



⚙️ Machine Learning Algorithms

- Logistic Regression  
- **Random Forest Classifier (Primary Model)**  
- XGBoost (optional improvement)



🧰 Technologies Used

- Python  
- Google Colab  
- Pandas  
- NumPy  
- Scikit-learn  
- Matplotlib  
- Seaborn  

---

📂 Project Structure

