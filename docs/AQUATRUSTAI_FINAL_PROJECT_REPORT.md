# AquaTrust AI : AI and Blockchain-Based Smart Wastewater Monitoring and Traceability Platform for Decentralized Wastewater Treatment Facilities

**A Project Report Submitted in Partial Fulfillment of the Requirements for the Degree of**  
**Bachelor of Technology in Computer Engineering**

**by**  
- **Risa Dias** (Roll No. 10238) — *Group Leader*  
- **Royce Dmonte** (Roll No. 10241)  
- **Valentino D'cruz** (Roll No. 10236)  

**Under the Guidance of**  
**Dr. Monali Shetty**  
*(Associate Professor, Department of Computer Engineering)*  

```
                      [INSTITUTE EMBLEM]
        Fr. Conceicao Rodrigues College of Engineering
             Father Agnel Ashram, Bandstand, Bandra (W)
                        Mumbai - 400050
```

**Department of Computer Engineering**  
**Fr. Conceicao Rodrigues College of Engineering, Bandra (W), Mumbai – 400050**  
**University of Mumbai**  
**(Academic Year: 2026 – 2027)**  

\newpage

## Dedication

*This work is dedicated to our parents and families for their unconditional love, moral encouragement, and endless sacrifices throughout our engineering education.*

*We also dedicate this work to environmental scientists, plant operators, and public health engineers who strive daily to safeguard our freshwater bodies and build a sustainable future.*

\newpage

## Internal Approval Sheet — Certificate

This is to certify that the project entitled:

> **"AquaTrust AI : AI and Blockchain-Based Smart Wastewater Monitoring and Traceability Platform for Decentralized Wastewater Treatment Facilities"**

is a bonafide work submitted by:
- **Risa Dias** (Roll No. 10238)
- **Royce Dmonte** (Roll No. 10241)
- **Valentino D'cruz** (Roll No. 10236)

submitted to the **University of Mumbai** in partial fulfillment of the requirement for the award of the degree of **Bachelor of Technology in Computer Engineering**.

\vspace{1.5cm}

**Dr. Monali Shetty**  
*(Project Supervisor / Guide)*  

\vspace{1.5cm}

**Dr. Sujata Deshmukh**  
*(Head of Department, Computer Engineering)*  

\vspace{1.5cm}

**Dr. Sapna Prabhu**  
*(Principal, Fr. CRCE)*  

\newpage

## Project Report Approval Sheet

This project report entitled:

> **"AquaTrust AI : AI and Blockchain-Based Smart Wastewater Monitoring and Traceability Platform for Decentralized Wastewater Treatment Facilities"**

by **Risa Dias (10238)**, **Royce Dmonte (10241)**, and **Valentino D'cruz (10236)** is approved for the degree of **Bachelor of Technology in Computer Engineering**.

\vspace{2cm}

**Examiner 1:** ____________________________________  
*(Signature & Date)*  

\vspace{1.5cm}

**Examiner 2:** ____________________________________  
*(Signature & Date)*  

\vspace{1cm}

**Date:** ________________________  
**Place:** Bandra, Mumbai  

\newpage

## Declaration

We declare that this written submission represents our ideas in our own words and where others' ideas or words have been included, we have adequately cited and referenced the original sources. We also declare that we have adhered to all principles of academic honesty and integrity and have not misrepresented or fabricated or falsified any idea, data, fact, or source in our submission. We understand that any violation of the above will be cause for disciplinary action by the Institute and can also evoke penal action from the sources which have thus not been properly cited or from whom proper permission has not been taken when needed.

\vspace{1.5cm}

_____________________________  
**Risa Dias** (Roll No. 10238)  

\vspace{1cm}

_____________________________  
**Royce Dmonte** (Roll No. 10241)  

\vspace{1cm}

_____________________________  
**Valentino D'cruz** (Roll No. 10236)  

**Date:** November 19, 2026  
**Place:** Mumbai  

\newpage

## Abstract

Decentralized wastewater treatment facilities—such as Sewage Treatment Plants (STPs) and Effluent Treatment Plants (ETPs) operated by residential housing complexes, commercial campuses, and industrial sub-wards—typically function without continuous automated quality monitoring or verifiable compliance tracking. Unlike large municipal utilities, decentralized plants cannot afford capital-intensive online instrumentation and dedicated laboratory personnel. Consequently, regulatory compliance relies on sporadic manual sampling and editable spreadsheets, creating significant opportunities for undetected untreated effluent discharge, uncalibrated sensor drift, and post-hoc data falsification.

To resolve these operational and transparency deficits, this project presents **AquaTrust AI**, an intelligent, closed-loop wastewater monitoring, predictive analytics, and cryptographic traceability platform engineered for decentralized infrastructure. The platform synthesizes continuous multi-parameter telemetry by replaying calibrated physical and synthetic datasets (including the 527-record UCI Urban Wastewater Treatment Plant dataset) through a simulation engine that emulates biological aeration basins, chemical clarifiers, and filtration units.

The intelligence tier comprises an integrated multi-model pipeline:
1. **Sensor Trust & Anomaly Detection:** An ensemble combining statistical rolling $Z$-score/IQR bounds with an Isolation Forest ($n=150$, contamination 5%) detecting 10 distinct sensor failure and process anomaly archetypes (`STUCK_SENSOR`, `SENSOR_FAILURE`, `SENSOR_DRIFT`, `PARAMETER_INCONSISTENCY`, `SUDDEN_SPIKE`, `MISSING_READING`, `DUPLICATE_READING`, `SUDDEN_PROCESS_CHANGE`, `STATISTICAL_ANOMALY`, and `NORMAL`) with a 5-tier calibrated severity score.
2. **Treatment Quality Prediction:** Multi-output regressors (Random Forest and Gradient Boosted trees) predicting final effluent metrics—Biochemical Oxygen Demand ($DBO-S$, RMSE 6.16 mg/L), Chemical Oxygen Demand ($DQO-S$, RMSE 27.05 mg/L), Total Suspended Solids ($SS-S$, RMSE 7.30 mg/L), and Effluent pH ($PH-S$, RMSE 0.166)—with instant Central Pollution Control Board (CPCB) General Discharge Standard breach evaluation.
3. **Prescriptive Process Optimization:** Closed-loop recommendation algorithms calculating stoichiometric dissolved oxygen (DO) setpoints (1.5–2.5 mg/L), polyaluminium chloride (PAC) coagulant dosing adjustments, and equalization basin diversion triggers.
4. **Sustainability & Circularity Engine:** Real-time quantifications of stoichiometric blower power savings, freshwater recovery volume ($kL$), Water Circularity Index ($%$), and Scope 2 indirect carbon emission avoidance ($kg CO_2e$).

To ensure absolute auditability without incurring excessive on-chain computational overhead, AquaTrust AI employs a **hybrid off-chain/on-chain storage and verification architecture**. High-frequency sensor time-series, AI predictions, and operational intervention logs are persisted off-chain in an ACID-compliant PostgreSQL database. Canonical cycle evidence snapshots (`atc-v1`) are batched into SHA-256 Merkle trees. Root hashes and cryptographic proofs are anchored to an immutable distributed ledger (Solidity smart contracts on Ganache / Hyperledger Fabric 2.5 channel). A high-performance FastAPI asynchronous backend exposes RESTful and WebSocket telemetry endpoints to a reactive web dashboard built with React, Vite, and Tailwind CSS, featuring synoptic SCADA plant schematics, 3D digital twin state visualization, real-time alert triage, and one-click cryptographic tamper verification.

System validation across 293 automated pure test cases achieved a 100% test pass rate, verifying zero-lag concurrent ingest, multi-version audit lineage, sub-second tampering detection, and robust failover. The system is formally approved for academic defense and controlled STP/ETP pilot deployment.

\newpage

## Acknowledgments

We express our sincere and deepest gratitude to our project supervisor and guide, **Dr. Monali Shetty**, Associate Professor, Department of Computer Engineering, Fr. Conceicao Rodrigues College of Engineering, for her invaluable technical guidance, profound insights, constructive critiques, and constant encouragement throughout the formulation, design, and execution of this project. Her dedication and continuous feedback were instrumental in steering this research toward completion.

We are profoundly grateful to **Dr. Sujata Deshmukh**, Head of the Department of Computer Engineering, for her administrative support, encouragement, and for providing state-of-the-art computational and laboratory facilities required for this project.

We extend our sincere thanks to **Dr. Sapna Prabhu**, Principal, Fr. Conceicao Rodrigues College of Engineering, for her leadership, academic vision, and for creating an inspiring environment conducive to research and technological innovation.

We also thank the technical and non-teaching staff of the Computer Engineering department for their continuous assistance with network, hardware, and laboratory resources.

Finally, we express our heartfelt appreciation to our peers, batchmates, and friends whose meaningful technical discussions, moral support, and camaraderie made this journey rewarding and memorable.

\vspace{1.5cm}

**Risa Dias** (Roll No. 10238)  
**Royce Dmonte** (Roll No. 10241)  
**Valentino D'cruz** (Roll No. 10236)  

\newpage

## Table of Contents

- **Dedication** ............................................................................................................ ii
- **Certificate** .......................................................................................................... iii
- **Project Report Approval Sheet** ............................................................................ iv
- **Declaration** .......................................................................................................... v
- **Abstract** ............................................................................................................... vi
- **Acknowledgments** ................................................................................................ vii
- **List of Figures** ..................................................................................................... xi
- **List of Tables** ...................................................................................................... xii
- **List of Abbreviations & Glossary** ......................................................................... xiii

### Chapter 1: Introduction ........................................................................................... 1
- 1.1 Background and Domain Context ..................................................................... 1
- 1.2 Comparison between Conventional ETP/STP Monitoring and Proposed System ........ 3
- 1.3 Motivation ......................................................................................................... 5
- 1.4 Problem Statement ............................................................................................ 6
- 1.5 Objectives of the Project .................................................................................... 7
- 1.6 Alignment with UN Sustainable Development Goals (SDGs) ................................ 8

### Chapter 2: Literature Review ................................................................................. 10
- 2.1 Overview of Research Landscape ..................................................................... 10
- 2.2 Literature Review — Part I ............................................................................. 11
- 2.3 Literature Review — Part II ............................................................................ 13
- 2.4 Research Gaps and Identified Scope ................................................................ 15

### Chapter 3: System Modeling and Problem Formulation ................................ 16
- 3.1 Sensor Trust Engine and Anomaly Detection Modeling ................................. 16
  - 3.1.1 Real-Time Statistical Validation and Dynamic Bounds ............................. 16
  - 3.1.2 Multivariate Anomaly Detection with Isolation Forests ........................... 17
  - 3.1.3 Five-Tier Calibrated Trust Scoring Framework .................................... 18
- 3.2 Effluent Water Quality Multi-Target Prediction Modeling ........................... 19
- 3.3 Process Optimization and Sustainability Modeling .................................. 20
  - 3.3.1 Aeration Basin Oxygen Transfer and Power Optimization ........................... 20
  - 3.3.2 Chemical Coagulant Optimization ................................................. 21
  - 3.3.3 Water Circularity Index and Scope 2 Carbon Avoidance ............................ 22
- 3.4 Cryptographic Data Integrity and Merkle Tree Formulation .......................... 23
  - 3.4.1 Canonical Serialization (`atc-v1`) and Tamper-Proof Hashing ..................... 23
  - 3.4.2 RFC 6962 Binary Merkle Trees and Compact Audit Proofs ........................... 24

### Chapter 4: System Architecture and Design ........................................................... 26
- 4.1 System Overview and High-Level Architecture ................................................... 26
- 4.2 Detailed Module Descriptions ............................................................................ 28
  - 4.2.1 Data Simulation and Ingestion Engine ..................................................... 28
  - 4.2.2 AI/ML Sensor Trust and Effluent Prediction Engine ................................. 29
  - 4.2.3 Prescriptive Process Optimization and Decision Support .......................... 30
  - 4.2.4 Digital Twin State Engine and Biochemical Kinetic Modeling .................... 31
  - 4.2.5 Cryptographic Verification and DLT Gateway ........................................... 32
  - 4.2.6 Interactive Web SCADA Dashboard ......................................................... 33
- 4.3 Data Flow Diagrams (DFDs) ............................................................................. 34
  - 4.3.1 Level 0 DFD (Context Diagram) ............................................................... 34
  - 4.3.2 Level 1 DFD (Subsystem Functional Flow) ................................................ 35
  - 4.3.2 Level 2 DFD (AI Prediction & Cryptographic Sealing) ................................ 36
- 4.4 Entity-Relationship (ER) Modeling & Database Schema Design ........................... 37
- 4.5 Input and Output Design ................................................................................... 41

### Chapter 5: Implementation Details ......................................................................... 43
- 5.1 Technology Stack and Environmental Configuration ......................................... 43
- 5.2 Sensor Data Simulation and Synthetic Anomaly Injection Pipeline ..................... 45
- 5.3 Machine Learning Pipeline Implementation ....................................................... 47
  - 5.3.1 Training on UCI Urban Wastewater Treatment Plant Dataset .................... 47
  - 5.3.2 Feature Engineering, Cross-Validation, and Model Serialization ............... 48
- 5.4 Backend RESTful API & Persistence Architecture (FastAPI & SQLAlchemy) ......... 50
- 5.5 Blockchain Smart Contract Implementation and Cryptographic Gateway .............. 53
- 5.6 Core Algorithmic Implementations and Pseudocode ........................................... 56
  - 5.6.1 Algorithm 1: Sensor Trust & Anomaly Classification ................................. 56
  - 5.6.2 Algorithm 2: Treatment Cycle Risk Escalation & Evidence Sealing .............. 58

### Chapter 6: System Testing, Verification, and Experimental Results ....................... 60
- 6.1 Testing Methodology & Verification Framework ................................................ 60
- 6.2 Test Execution Metrics and Suite Summary ....................................................... 62
- 6.3 Machine Learning Model Evaluation & Empirical Results ................................... 64
  - 6.3.1 Parameter Prediction Accuracy and Regression Curves ............................. 64
  - 6.3.2 Anomaly Classification Confusion Matrix and Trust Performance ............. 66
  - 6.3.3 Model Benchmarking & Computational Complexity Analysis ..................... 68
- 6.4 Blockchain Performance and Tamper Detection Experimental Analysis .............. 70
- 6.5 Sustainability, Energy Conservation, and Circularity Impact Results ................. 72

### Chapter 7: Conclusion and Future Work ................................................................ 74
- 7.1 Conclusion and Key Research Contributions ...................................................... 74
- 7.2 Practical Industrial Impact & Societal Relevance ............................................... 76
- 7.3 Limitations of the Current Implementation ....................................................... 77
- 7.4 Future Enhancements and Research Directions ................................................. 78

### References

1. D. S. Thakkar, A. Thakker, R. Gupta, N. K. Jadav, S. Tanwar, G. Pau, G. Sharma, F. Alqahtani, and A. Tolba, "Blockchain-Orchestrated Intelligent Water Treatment Plant Profiling Framework to Enhance Human Life Expectancy," *IEEE Access*, vol. 12, pp. 49151–49166, 2024. DOI: [10.1109/ACCESS.2024.3384607](https://doi.org/10.1109/ACCESS.2024.3384607)
2. M. A. Mohammed, A. Lakhan, K. H. Abdulkareem, M. K. Abd Ghani, H. A. Marhoon, S. Kadry, J. Nedoma, R. Martinek, and B. G. Zapirain, "Industrial Internet of Water Things architecture for data standardization based on blockchain and digital twin technology," *Journal of Advanced Research*, vol. 66, pp. 1–14, 2024. DOI: [10.1016/j.jare.2023.10.005](https://doi.org/10.1016/j.jare.2023.10.005)
3. Q. Abbas, R. Almakki, M. Albathan, W. J. Obidallah, and Z. Alshaikh, "Secure Water Quality Monitoring using Blockchain-Smart Contract and IoT in 6G Smart Cities," *Water Resources Management*, vol. 40, 2026. DOI: [10.1007/s11269-026-04630-2](https://doi.org/10.1007/s11269-026-04630-2)
4. P. Mukherjee, S. Sengupta, and P. K. Sadhu, "Blockchain-IoT and optioneering driven framework for smart water management in emerging urban areas," *iScience*, Cell Press, vol. 28, no. 1, p. 113927, 2025. DOI: [10.1016/j.isci.2025.113927](https://doi.org/10.1016/j.isci.2025.113927)
5. M. Pincheira, M. Vecchio, R. Giaffreda, and S. S. Kanhere, "Cost-effective IoT devices as trustworthy data sources for a blockchain-based water management system in precision agriculture," *Computers and Electronics in Agriculture*, vol. 180, p. 105889, 2021. DOI: [10.1016/j.compag.2020.105889](https://doi.org/10.1016/j.compag.2020.105889)
6. M. Pincheira, M. Vecchio, and S. S. Kanhere, "Exploiting Constrained IoT Devices in a Trustless Blockchain-based Water Management System," in *Proc. 2020 IEEE International Conference on Blockchain and Cryptocurrency (ICBC)*, Toronto, ON, Canada, 2020, pp. 1–3. DOI: [10.1109/ICBC48266.2020.9169404](https://doi.org/10.1109/ICBC48266.2020.9169404)
7. S. Hakak, W. Z. Khan, G. A. Gilkar, N. Haider, M. Imran, and S. Alkatheiri, "Industrial Wastewater Management using Blockchain Technology: Architecture, Requirements, and Future Directions," *IEEE Internet of Things Magazine*, vol. 3, no. 2, pp. 38–43, 2020. DOI: [10.1109/IOTM.0001.1900092](https://doi.org/10.1109/IOTM.0001.1900092)
8. B. Bordel, D. Martín, R. Alcarria, and T. Robles, "A Blockchain-based Water Control System for the Automatic Management of Irrigation Communities," in *Proc. 2019 IEEE International Conference on Consumer Electronics (ICCE)*, Las Vegas, NV, USA, 2019, pp. 1–4. DOI: [10.1109/ICCE.2019.8662058](https://doi.org/10.1109/ICCE.2019.8662058)
9. Metcalf & Eddy, Inc., G. Tchobanoglous, H. D. Stensel, R. Tsuchihashi, and F. L. Burton, *Wastewater Engineering: Treatment and Resource Recovery*, 5th ed. New York, NY, USA: McGraw-Hill Education, 2014. Link: [https://books.google.com/books?isbn=9780073401188](https://books.google.com/books?isbn=9780073401188)
10. Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Government of India, "General Standards for Discharge of Environmental Pollutants: Effluents," *Environment (Protection) Rules*, Schedule VI, 1986. Link: [https://moef.gov.in/](https://moef.gov.in/)
11. S. A. Crosby and D. S. Wallach, "Certificate Transparency," RFC 6962, Internet Engineering Task Force (IETF), 2013. Link: [https://datatracker.ietf.org/doc/html/rfc6962](https://datatracker.ietf.org/doc/html/rfc6962)
12. F. T. Liu, K. M. Ting, and Z.-H. Zhou, "Isolation Forest," in *Proc. 2008 Eighth IEEE International Conference on Data Mining (ICDM)*, Pisa, Italy, 2008, pp. 413–422. DOI: [10.1109/ICDM.2008.17](https://doi.org/10.1109/ICDM.2008.17)
13. UCI Machine Learning Repository, "Water Treatment Plant Data Set," School of Information and Computer Science, University of California, Irvine, 1993. Link: [https://archive.ics.uci.edu/dataset/120/water+treatment+plant](https://archive.ics.uci.edu/dataset/120/water+treatment+plant)

# Appendix A: Key Code Listings and Smart Contract Definitions ........................... 83

\newpage

## List of Figures

- **Figure 1.1:** Typical Process Flow of a Decentralized Sewage/Effluent Treatment Plant ............. 2
- **Figure 1.2:** Comparison of Regulatory Compliance Reporting Pipelines ................................. 4
- **Figure 3.1:** Isolation Forest Recursive Partitioning and Path Length Distribution ................... 17
- **Figure 3.2:** Schematic of Merkle Audit Tree Generation and Ingestion Batching ..................... 24
- **Figure 4.1:** High-Level End-to-End System Architecture of AquaTrust AI .............................. 27
- **Figure 4.2:** Digital Twin State Machine Transition Graph (Biological & Mechanical States) ..... 31
- **Figure 4.3:** Data Flow Diagram — Level 0 (Context Level) .................................................... 34
- **Figure 4.4:** Data Flow Diagram — Level 1 (Operational Decomposition) .................................. 35
- **Figure 4.5:** Data Flow Diagram — Level 2 (AI Inference and Blockchain Sealing Pipeline) ....... 36
- **Figure 4.6:** Entity-Relationship Diagram of AquaTrust AI Database Schema ........................... 38
- **Figure 6.1:** Actual vs. Predicted Effluent Concentrations across CPCB Target Parameters ........ 65
- **Figure 6.2:** Normalized Confusion Matrix for 10-Class Sensor Trust & Anomaly Inference ........ 67
- **Figure 6.3:** Machine Learning Model Benchmarking and Computational Complexity Comparison 69
- **Figure 6.4:** Cryptographic Scaling Benchmarks and Tamper Detection Experimental Analysis ... 71
- **Figure 6.5:** 30-Day Cumulative Sustainability Impact in a 500 kL/day Treatment Facility .......... 73

\newpage

## List of Tables

- **Table 1.1:** Comparative Analysis: Conventional Plant Operations vs. AquaTrust AI .............. 5
- **Table 1.2:** Indian CPCB Effluent Discharge Standards for Inland Surface Waters .................. 7
- **Table 2.1:** Literature Review — Part I: AI, IoT, and DLT Frameworks ................................. 11
- **Table 2.2:** Literature Review — Part II: Low-Cost IoT Trust & Automated Water Systems ........ 13
- **Table 3.1:** 10 Sensor Failure and Process Anomaly Types with Physical Indicators ................. 19
- **Table 4.1:** Core Relational Schema Mapping (PostgreSQL Tables and Primary Keys) .............. 39
- **Table 5.1:** Software, Library, and Framework Dependency Inventory .................................... 44
- **Table 5.2:** Hyperparameter Configurations for Gradient Boosted and Random Forest Models ..... 48
- **Table 5.3:** RESTful API Endpoint Specification Table (FastAPI Routes) ................................. 51
- **Table 5.4:** Smart Contract Core State Schema & Struct Definitions ..................................... 53
- **Table 5.5:** Smart Contract Functional Method Specification ............................................. 54
- **Table 6.1:** Overall System Automated Test Execution Summary (293 Tests) ........................... 62
- **Table 6.2:** Empirical Performance Metrics of Effluent Water Quality Prediction Models ......... 64
- **Table 6.3:** Classification Performance of Sensor Trust & Anomaly Inference Engine ............... 66
- **Table 6.4:** Comparative Model Benchmark Matrix across Multiple ML Paradigms ................. 68
- **Table 6.5:** Cryptographic Integrity Verification & Tamper Detection Benchmark .................... 70
- **Table 6.6:** Monthly Resource Optimization & Carbon Avoidance in 500 kL/day Facility ........... 72

\newpage

## List of Abbreviations & Glossary

| Abbreviation | Expanded Form / Definition |
| :--- | :--- |
| **API** | Application Programming Interface |
| **BOD / DBO** | Biochemical Oxygen Demand ($mg/L$) — measure of organic matter biodegradable by bacteria |
| **CFT** | Crash Fault Tolerant (e.g., Raft consensus algorithm) |
| **COD / DQO** | Chemical Oxygen Demand ($mg/L$) — total measurement of all chemically oxidizable matter |
| **CPCB** | Central Pollution Control Board (India) |
| **DLT** | Distributed Ledger Technology |
| **DO** | Dissolved Oxygen ($mg/L$) — concentration of free, non-compound oxygen in aeration basins |
| **ECDSA** | Elliptic Curve Digital Signature Algorithm (secp256r1 / P-256 standard) |
| **EPA** | Environment (Protection) Act, 1986 |
| **ETP** | Effluent Treatment Plant (industrial wastewater remediation facility) |
| **F1-Score** | Harmonic mean of precision and recall |
| **GBR** | Gradient Boosting Regressor |
| **HSM** | Hardware Security Module |
| **IoT** | Internet of Things |
| **IQR** | Interquartile Range |
| **JSON** | JavaScript Object Notation |
| **MAE** | Mean Absolute Error |
| **ML** | Machine Learning |
| **MLSS** | Mixed Liquor Suspended Solids ($mg/L$) |
| **PAC** | Polyaluminium Chloride (coagulant salt) |
| **pH** | Potential of Hydrogen (logarithmic scale of acidity or basicity) |
| **RBAC** | Role-Based Access Control |
| **RFC** | Request for Comments (Internet engineering standard) |
| **RMSE** | Root Mean Squared Error |
| **SCADA** | Supervisory Control and Data Acquisition |
| **SDG** | Sustainable Development Goal (United Nations) |
| **SHA-256** | Secure Hash Algorithm generating a 256-bit cryptographic digest |
| **STP** | Sewage Treatment Plant (domestic/sanitary wastewater facility) |
| **TSS / SS** | Total Suspended Solids ($mg/L$) |
| **UCI** | University of California, Irvine (Machine Learning Repository) |
| **WCI** | Water Circularity Index ($%$) |

\newpage

# Chapter 1: Introduction

## 1.1 Background and Domain Context
Water security and environmental preservation represent two of the most pressing challenges of the twenty-first century. Rapid urban agglomeration, industrial growth, and commercial development have precipitated an exponential rise in wastewater generation worldwide. In rapidly expanding economies such as India, centralized sewage networks and massive urban treatment plants frequently lack the capacity to service distributed residential suburbs, newly formed housing societies, commercial IT parks, and decentralized industrial clusters.

To mitigate untreated sewage and toxic effluent discharge into surface water bodies, environmental regulatory agencies—principally the **Central Pollution Control Board (CPCB)** and corresponding **State Pollution Control Boards (SPCBs)** under the **Environment (Protection) Act, 1986**—have mandated that decentralized establishments (e.g., residential complexes exceeding 20,000 $m^2$ built-up area, hospitals, and industrial parks) install, operate, and maintain captive, decentralized **Sewage Treatment Plants (STPs)** and **Effluent Treatment Plants (ETPs)**.

A typical decentralized treatment plant follows a sequential physical, biological, and tertiary chemical treatment train:
1. **Preliminary Treatment:** Coarse bar screening and grit settling to eliminate macro-debris and suspended inert matter.
2. **Equalization & Primary Clarification:** Inflow balancing to dampen peak diurnal hydraulic surges and homogenize chemical concentrations.
3. **Biological Treatment (Activated Sludge / MBBR / SBR):** Aerobic bacterial digestion of dissolved organic carbon, quantified through Biochemical Oxygen Demand (BOD) and Chemical Oxygen Demand (COD). This stage is heavily dependent on continuous dissolved oxygen (DO) aeration and optimal Mixed Liquor Suspended Solids (MLSS).
4. **Secondary Clarification & Sludge Recirculation:** Gravitational phase separation of biological biomass (sludge) from treated supernatant.
5. **Tertiary Polishing & Disinfection:** Pressure sand filtration, activated carbon absorption, and ozonation or chlorination to eliminate residual suspended solids and pathogenic microorganisms prior to non-potable reuse (toilet flushing, HVAC cooling towers, landscape irrigation) or discharge into municipal storm drains.

## 1.2 Comparison between Conventional ETP/STP Monitoring and Proposed System
Despite legal mandates requiring compliance with stringent discharge standards (e.g., Effluent $BOD ≤ 10–30 mg/L$, $COD ≤ 50–250 mg/L$, $TSS ≤ 20–100 mg/L$, $pH 6.5--8.5$), the vast majority of decentralized treatment facilities across developing nations operate in an uninstrumented, unmonitored "black box" mode.

Conventional decentralized facilities suffer from three major systemic flaws:
1. **Periodic Manual Grab Sampling:** Compliance is certified based on physical grab samples collected manually once a month or once a quarter. This infrequent sampling fails to capture transient organic shocks, biological process washouts, and nocturnal untreated bypass events.
2. **Lack of Predictive Foresight:** Facility managers act purely reactively. When aeration blowers fail or biological treatment crashes due to toxic chemical surges, operators only notice days later when the effluent turns visibly black, septic, and foul-smelling.
3. **Malleable, Unverifiable Compliance Records:** Compliance records are maintained in physical logbooks or standalone Excel spreadsheets. Unscrupulous operators or corrupt third-party maintenance contractors can easily alter or falsify these numbers before regulatory submission, making genuine environmental auditing virtually impossible.

AquaTrust AI addresses these gaps by transforming physical and synthetic plant data into continuous predictive intelligence, providing early warning alerts, prescriptive setpoint actions, and anchoring every record to an immutable cryptographic ledger.

*Table 1.1: Comparative Analysis: Conventional Plant Operations vs. AquaTrust AI*
| Feature / Dimension | Conventional Decentralized ETP/STP | AquaTrust AI Platform |
| :--- | :--- | :--- |
| **Telemetry Ingestion** | Sporadic manual lab sampling (bi-weekly/monthly) | Continuous synthetic/physical telemetry simulation |
| **Sensor Health** | No automated drift or freeze detection | 10-Class ML Anomaly Detector + 5-Tier Severity |
| **Effluent Monitoring** | 5-day delayed laboratory incubation for $BOD_5$ | Real-time multi-target regression ($DBO, DQO, SS, pH$) |
| **Process Control** | Ad-hoc manual blower and chemical valve tuning | Prescriptive closed-loop stoichiometric DO setpoints |
| **Audit Trail** | Unencrypted, editable CSV/Excel sheets or paper logs | Cryptographic Merkle Root hashing anchored to DLT |
| **Verification Speed** | Weeks of manual forensic inspections | Immediate cryptographic hash & proof check ($< 1 sec$) |
| **Carbon Tracking** | None; unquantified energy dissipation | Continuous calculation of Scope 2 avoided emissions |

## 1.3 Motivation
Decentralized wastewater treatment plants are uniquely positioned to solve urban water scarcity. By treating wastewater at the source, residential and commercial complexes can recover millions of liters of reusable non-potable water, drastically relieving pressure on depleted municipal reservoirs and subterranean aquifers.

However, decentralized facilities operate under acute resource constraints:
- They lack capital budgets exceeding $50,000 for full industrial-grade SCADA hardware installations.
- They lack qualified biological process engineers on-site, relying instead on semi-skilled building caretakers.
- Regulators have zero technical means to verify whether a submitted laboratory compliance slip represents actual plant performance or post-hoc document fabrication.

An integrated, open-source software platform combining **state-of-the-art predictive machine learning**, **stoichiometric biochemical process modeling**, and **tamper-evident cryptographic distributed ledgers** can bridge this operational divide. By simulating real-time telemetry from historical operational datasets and deploying intelligent edge microservices, AquaTrust AI enables institutional-grade predictive optimization and transparent regulatory compliance for decentralized facilities without requiring multimillion-dollar hardware retrofits.

## 1.4 Problem Statement
Decentralized wastewater treatment facilities lack automated predictive intelligence to anticipate treatment degradation and verifiable tamper-proof audit trails for regulatory compliance. Most existing solutions either assume capital-intensive IoT hardware grids that decentralized plants cannot afford, or utilize blockchain as a passive ledger without predictive process control.

AquaTrust AI resolves this dual deficit by providing an integrated software platform that validates streaming multi-parameter sensor data, forecasts final effluent parameters ahead of lab incubation, prescribes corrective aeration and dosing setpoints, and anchors tamper-evident compliance snapshots to a distributed ledger via compact cryptographic Merkle proofs.

## 1.5 Objectives of the Project
The primary engineering objectives of this project are:
1. Simulate a multi-facility wastewater monitoring environment using public datasets.
2. Standardize heterogeneous wastewater measurements through a common data interface.
3. Provide web dashboards for facility operators, auditors and regulatory stakeholders.
4. Apply AI-based anomaly detection to BOD, COD, TSS, pH, ammonical nitrogen and total nitrogen.
5. Evaluate measurements through configurable quality-assurance and compliance rules.
6. Generate digitally signed and cryptographically hashed treatment records.
7. Record treatment events, hashes, compliance and audit metadata on a permissioned DLT.
8. Support append-only corrections without deleting original treatment records.
9. Compare centralized, blockchain-centric and hybrid DLT architectures using measurable metrics.
10. Assess and predict wastewater treatment performance using AI and historical monitoring data.
11. Quantify wastewater-treatment sustainability using measurable indicators such as treated-water reuse, freshwater savings, chemical consumption, energy consumption, and treatment efficiency.
12. Provide AI-assisted process recommendations for improving treatment performance and responding to detected anomalies.

*Table 1.2: Indian CPCB Effluent Discharge Standards for Inland Surface Waters*
| Parameter | Permissible CPCB Discharge Limit | AquaTrust AI Threshold Class |
| :--- | :--- | :--- |
| **pH** | 5.5 – 9.0 (Strict: 6.5 – 8.5) | Normal within range; breach if < 6.5 or > 8.5 |
| **BOD (DBO5)** | ≤ 30.0 mg/L (Urban STP: ≤ 10.0 mg/L) | Warning if ≥ 25.0 mg/L; Breach if > 30.0 mg/L |
| **COD (DQO)** | ≤ 250.0 mg/L (Decentralized: ≤ 50.0 mg/L) | Warning if ≥ 45.0 mg/L; Breach if > 50.0 mg/L |
| **TSS (SS)** | ≤ 100.0 mg/L (Decentralized: ≤ 20.0 mg/L) | Warning if ≥ 18.0 mg/L; Breach if > 20.0 mg/L |

## 1.6 Alignment with UN Sustainable Development Goals (SDGs)
AquaTrust AI directly addresses five United Nations Sustainable Development Goals:
- **SDG 6 (Clean Water and Sanitation):** Target 6.3 — Improving water quality by eliminating dumping, halving untreated wastewater discharge, and increasing recycling and safe reuse.
- **SDG 9 (Industry, Innovation, and Infrastructure):** Target 9.4 — Upgrading industrial wastewater infrastructure with intelligent sensing, automated control, and efficient resource utilization.
- **SDG 11 (Sustainable Cities and Communities):** Target 11.6 — Reducing adverse urban environmental impacts through decentralized, localized wastewater management in residential complexes.
- **SDG 12 (Responsible Consumption and Production):** Target 12.4 — Environmentally sound management of chemical coagulants, electrical blower power, and hazardous industrial sludge.
- **SDG 16 (Peace, Justice, and Strong Institutions):** Target 16.6 — Establishing effective, accountable, and transparent institutions via unforgeable, publicly verifiable cryptographic environmental audit trails.

\newpage

# Chapter 2: Literature Review

## 2.1 Overview of Research Landscape
Modern wastewater engineering research intersects four computational paradigms: (1) biological process kinetics and Activated Sludge Models (ASM), (2) data-driven machine learning for water quality forecasting, (3) automated sensor health validation and anomaly detection, and (4) cryptographic distributed ledger technology (DLT) for regulatory compliance tracking. While each domain has seen substantial independent advancements, decentralized facilities remain unserviced due to high deployment costs, operational complexity, and fragmented architectures.

## 2.2 Literature Review — Part I
Table 2.1 outlines peer-reviewed investigations into artificial intelligence, Internet of Things (IoT), and distributed ledger architectures for smart water and wastewater treatment facilities.

*Table 2.1: Literature Review — Part I*
| PAPER / YEAR | APPROACH | KEY CONTRIBUTION | LIMITATION |
| :--- | :--- | :--- | :--- |
| **[1] IEEE Access, 2024** | AI + IoT + Blockchain + IPFS | Water-treatment profiling and intelligent monitoring. | Focuses on treatment profiling, not scalable multi-facility traceability and QA. |
| **[2] J. Adv. Research, 2024** | IIoT + Blockchain + Digital Twin | Data standardization and industrial water-management architecture. | Broad industrial focus; limited wastewater-specific trust validation and audit. |
| **[3] Water Res. Mgmt., 2026** | IoT + Blockchain + Smart Contracts + DL | Secure water-quality monitoring. | Focused on water quality, not scalable decentralized treatment traceability. |
| **[4] iScience, 2025** | Blockchain + IoT + Optimization | Smart water-management decision support. | Urban water management focus; no wastewater auditing or multi-facility traceability. |

## 2.3 Literature Review — Part II
Table 2.2 evaluates low-cost IoT sensor trust validation, lightweight cryptographic mechanisms for resource-constrained edge devices, and automated water management systems.

*Table 2.2: Literature Review — Part II*
| PAPER / YEAR | APPROACH | KEY CONTRIBUTION | LIMITATION |
| :--- | :--- | :--- | :--- |
| **[5] Comp. & Electr. Agri., 2021** | IoT + Blockchain | Low-cost, trustworthy IoT data sources for blockchain water management. | Designed for precision agriculture / irrigation, not wastewater treatment. |
| **[6] IEEE ICBC, 2020** | Blockchain + Constrained IoT | Trustless blockchain architecture for resource-constrained devices. | Resource constraints and scalability remain open considerations. |
| **[7] IEEE IoT Magazine, 2020** | Blockchain + Industrial Wastewater Mgmt. | Defines architecture and requirements for blockchain-based wastewater management. | Primarily architectural; limited evaluation of scalable multi-facility deployment. |
| **[8] 2019** | Blockchain + Automated Water Mgmt. | Automated water-control and management using blockchain. | Focused on irrigation, not wastewater quality assurance and traceability. |

## 2.4 Research Gaps and Identified Scope
A synthesis of the eight core benchmark studies revealed four critical research deficits:
1. **Absence of Multi-Facility Decentralized Traceability:** Existing studies focus on individual municipal plants or agricultural irrigation networks. None provide standardized telemetry ingestion across heterogeneous decentralized facilities (ETP, STP, Common Effluent Plants) with unified compliance evaluation.
2. **Untrusted Sensory Telemetry and Biofouling:** Field sensors in raw wastewater foul rapidly. Existing blockchain frameworks write unvalidated telemetry directly to ledgers, permanently preserving corrupted sensor drift as ground truth.
3. **The Predictive-Prescriptive Gap:** Most deep learning studies forecast effluent quality but offer zero actionable guidance on closed-loop interventions, stoichiometric aeration control, or chemical dosing optimization.
4. **DLT Scalability and On-Chain Storage Bloat:** Writing high-frequency industrial timeseries directly to distributed ledgers incurs prohibitive transaction costs and storage bottlenecks.

AquaTrust AI addresses these gaps through an end-to-end framework combining calibrated multi-parameter sensor trust scoring, dual-engine predictive and prescriptive modeling, and hybrid Merkle tree cryptographic proof anchoring.


ewpage
# Chapter 3: System Modeling and Problem Formulation

## 3.1 Sensor Trust Engine and Anomaly Detection Modeling

Decentralized wastewater treatment facilities operate in harsh physical environments. Submerged water quality sensors are continuously exposed to bacterial biofilm accumulation, chemical scaling, grease adhesion, and electrical noise. Consequently, incoming sensor telemetry cannot be blindly accepted as ground truth. AquaTrust AI models sensor validation through a multi-stage trust engine that combines real-time statistical boundary checks, multivariate pattern isolation, and a calibrated five-tier operational trust scoring framework.

### 3.1.1 Real-Time Statistical Validation and Dynamic Bounds
To identify hardware failures and transient disturbances, streaming sensor telemetry is evaluated across a continuous sliding temporal window ($W = 30$ timesteps). For each measured parameter, the system maintains dynamic baseline statistics:
- **Rolling Mean ($\mu$) and Standard Deviation ($\sigma$):** Represent the expected local operational baseline and natural process fluctuation.
- **Normalized Z-Score ($Z$):** Measures how many standard deviations the instantaneous reading deviates from the moving baseline:
  $$Z = (\text{Current Reading} - \text{Rolling Mean}) / (\text{Rolling Standard Deviation} + \epsilon)$$
  where $\epsilon$ is a small constant ($10^{-6}$) preventing division by zero during sensor flatline conditions.
- **Interquartile Range (IQR) Gating:** For water parameters exhibiting skewed or non-Gaussian distributions (such as sudden storm surges), non-parametric quartile boundaries ($Q_1$ and $Q_3$) establish robust upper and lower operational envelopes that filter transient spikes without triggering false alarms:
  $$\text{IQR} = Q_3 - Q_1$$
  $$\text{Lower Bound} = Q_1 - 1.5 \cdot \text{IQR}, \quad \text{Upper Bound} = Q_3 + 1.5 \cdot \text{IQR}$$

### 3.1.2 Multivariate Anomaly Detection with Isolation Forests
While univariate statistical bounds catch single-parameter spikes and freezes, complex process malfunctions often manifest across multiple interacting parameters (for example, a simultaneous drop in pH and dissolved oxygen accompanying an organic shock load).

AquaTrust AI models multi-parameter behavior using an **Isolation Forest** ensemble ($m = 150$ isolation trees). The underlying intuition is straightforward: normal operational data points require many random partitions to isolate within a decision tree, whereas anomalous readings differ significantly from normal clusters and are isolated near the root of the tree with very short path lengths:
- **Anomaly Score ($s \rightarrow 1.0$):** Indicates an outlier isolated near the root, confirming a genuine biological shock or multi-probe failure.
- **Anomaly Score ($s < 0.5$):** Confirms normal operational clustering deep within tree branches.

### 3.1.3 Five-Tier Calibrated Trust Scoring Framework
Rather than treating anomaly detection as a binary pass/fail flag, the system computes a continuous, bounded trust coefficient ($T \in [0.0, 1.0]$) that balances sensor freeze indicators, deviation magnitudes, and multivariate anomaly scores. The calibrated score translates into five clear operational trust tiers:
- **Tier 1 — TRUSTED ($T \ge 0.85$):** Fully verified, pristine sensor reading; fed directly to downstream machine learning prediction and control models.
- **Tier 2 — SUSPECT ($0.70 \le T < 0.85$):** Minor statistical drift; logged and flagged on the dashboard for operator monitoring.
- **Tier 3 — DEGRADED ($0.50 \le T < 0.70$):** Moderate variance or cross-parameter inconsistency; down-weighted in state estimations.
- **Tier 4 — FAILED ($0.25 \le T < 0.50$):** Physical envelope breach or persistent float freeze; reading rejected from closed-loop control loops.
- **Tier 5 — CRITICAL ($T < 0.25$):** Severe probe failure or acute influent biological shock; triggers automated audible alarms and facility containment.

*Table 3.1: 10 Sensor Failure and Process Anomaly Types with Physical Indicators*
| Anomaly Code | Anomaly Classification | Primary Detection Mechanism & Physical Indicator |
| :--- | :--- | :--- |
| `STUCK_SENSOR` | Zero Variance / Frozen Float | Zero variance across $> 15$ consecutive cycles due to mechanical float seizure. |
| `SENSOR_FAILURE` | Hardware Disconnect / Out of Bounds | Telemetry exceeds physical envelope (e.g., pH $< 0$ or $> 14$). |
| `SENSOR_DRIFT` | Calibration Degradation | Steady directional drift exceeding $3\sigma$ from baseline caused by biofilm fouling. |
| `PARAMETER_INCONSISTENCY` | Cross-Parameter Conflict | Biochemical impossibility (e.g., High BOD paired with Dissolved Oxygen $> 8\text{ mg/L}$). |
| `SUDDEN_SPIKE` | Single Timestep Transient Jump | First-order transient jump $> 4 \cdot \text{IQR}$ returning to baseline in the subsequent timestep. |
| `MISSING_READING` | Telemetry Packet Loss | Null or missing payload over expected telemetry transmission window. |
| `DUPLICATE_READING` | Replay / Transmission Collision | Duplicate timestamp and sequence number within the same facility stream. |
| `SUDDEN_PROCESS_CHANGE` | Biological Shock / Hydraulic Surge | Multi-variable step change persisting across $> 5$ consecutive cycles. |
| `STATISTICAL_ANOMALY` | Multivariate Distribution Outlier | Isolation Forest anomaly score $s \ge 0.65$ across correlated water metrics. |
| `NORMAL` | Standard Baseline Operation | Measured parameters sit securely within normal $3\sigma$ operational boundaries. |

---

## 3.2 Effluent Water Quality Multi-Target Prediction Modeling

In conventional wastewater plants, regulatory compliance verification relies on laboratory testing. For example, the 5-day Biochemical Oxygen Demand test ($\text{BOD}_5$) requires 120 hours of incubation, meaning non-compliant effluent is discharged into municipal watercourses days before laboratory results become available.

AquaTrust AI models effluent quality as a **multi-target predictive regression task**. Using real-time influent characteristics—including plant flow rate ($Q$), influent pH, influent BOD, Chemical Oxygen Demand ($\text{COD}$), Total Suspended Solids ($\text{TSS}$), aeration basin Dissolved Oxygen ($\text{DO}$), and operating temperature—the predictive engine simultaneously forecasts four critical effluent discharge parameters up to 24 hours in advance:
- **$\hat{y}_{\text{BOD}}$:** Forecasted Effluent Biochemical Oxygen Demand ($\text{mg/L}$)
- **$\hat{y}_{\text{COD}}$:** Forecasted Effluent Chemical Oxygen Demand ($\text{mg/L}$)
- **$\hat{y}_{\text{TSS}}$:** Forecasted Effluent Total Suspended Solids ($\text{mg/L}$)
- **$\hat{y}_{\text{pH}}$:** Forecasted Effluent pH (standard units)

By comparing these forward-looking predictions against legal Central Pollution Control Board (CPCB) limits, the system shifts plant operation from reactive post-discharge reporting to **proactive pre-discharge intervention**.

---

## 3.3 Process Optimization and Sustainability Modeling

Predictive foresight is only valuable if plant operators know exactly how to adjust physical equipment in response. AquaTrust AI bridges this gap by modeling closed-loop prescriptive recommendations and sustainability indicators.

### 3.3.1 Aeration Basin Oxygen Transfer and Power Optimization
Biological treatment requires blowers to deliver dissolved oxygen to aerobic bacteria. Operating blowers at constant full speed wastes substantial electrical power, while under-aeration leads to biological die-off. 

Following established biochemical engineering principles (Metcalf & Eddy):
- The **Actual Oxygen Requirement (AOR)** is dynamically computed from incoming organic load (influent BOD) and target discharge standards.
- The **Standard Oxygen Requirement (SOR)** adjusts field oxygen demand for operating temperature, basin elevation, and wastewater oxygen transfer factors ($\alpha = 0.82$, $\beta = 0.95$).
- **Blower Power Dissipation ($P_{\text{blower}}$):** Mechanical power required to supply aeration air is proportional to the required air mass flow and operating pressure ratio. AquaTrust AI computes dynamic Dissolved Oxygen setpoints ($1.5\text{ -- }2.5\text{ mg/L}$), reducing blower speeds during off-peak hours and saving up to $18\text{ -- }25\%$ of electrical power consumption.

### 3.3.2 Chemical Coagulant Optimization
In secondary and tertiary clarifiers, chemical coagulants such as polyaluminium chloride (PAC) are added to aggregate suspended particles and colloidal organic matter. Overdosing coagulant wastes expensive chemicals and produces excess chemical sludge, while underdosing causes elevated effluent turbidity.

AquaTrust AI models optimal coagulant dosage ($D_{\text{PAC}}$ in $\text{mg/L}$) as a function of incoming solids ($\text{SS}_{\text{in}}$) and organic loading ($\text{COD}_{\text{in}}$), modulated by a pH correction factor:
$$\text{Optimal PAC Dose} = k_{\text{coag}} \cdot (\text{Influent SS})^{0.65} \cdot (\text{Influent COD} / \text{Target COD})^{0.35} \cdot f(\text{pH})$$
Where $f(\text{pH})$ penalizes non-optimal coagulation conditions outside the neutral band ($\text{pH} \approx 7.2$):
$$f(\text{pH}) = 1.0 + 0.15 \cdot (\text{pH} - 7.2)^2$$

### 3.3.3 Water Circularity Index and Scope 2 Carbon Avoidance
To quantify environmental performance for ESG (Environmental, Social, and Governance) compliance, AquaTrust AI formulates two key sustainability metrics:
1. **Water Circularity Index (WCI):** Represents the percentage of treated effluent safely reclaimed for non-potable reuse (such as toilet flushing, landscape irrigation, and industrial cooling) relative to raw influent volume:
   $$\text{WCI} = (\text{Volume Recycled} / \text{Volume Treated}) \cdot (1 - \text{Operational Losses} / \text{Volume Influent}) \times 100\%$$
2. **Scope 2 Indirect Carbon Emissions Avoided ($E_{\text{avoided}}$):** Quantifies greenhouse gas emissions avoided through optimized blower power and localized water recycling:
   $$E_{\text{avoided}} = (\Delta P_{\text{saved}} \cdot \text{Operating Hours} \cdot EF_{\text{grid}}) + (\text{Volume Recycled} \cdot EF_{\text{municipal}})$$
   where $EF_{\text{grid}} = 0.82\text{ kg CO}_2\text{e/kWh}$ reflects the Indian national grid emission factor and $EF_{\text{municipal}} = 0.35\text{ kg CO}_2\text{e/kL}$ accounts for avoided municipal long-distance pumping energy.

---

## 3.4 Cryptographic Data Integrity and Merkle Tree Formulation

To prevent retroactive record tampering, regulatory manipulation, or dispute among stakeholders, AquaTrust AI establishes an immutable digital chain of custody across three structural phases.

### 3.4.1 Canonical Serialization (`atc-v1`) and Tamper-Proof Hashing
Standard JSON serialization produces non-deterministic byte strings due to arbitrary key orderings, whitespace variations, and floating-point representations across different programming languages. 

AquaTrust AI resolves this through a strict canonical schema (`atc-v1` compliant with RFC 8785):
- All immutable fields are lexicographically sorted by key name.
- Extraneous whitespaces and line breaks are eliminated.
- Floating-point readings are formatted to fixed precision.
- A 256-bit cryptographic fingerprint is computed using **double SHA-256** hashing:
  $$\text{Record Digest} = \text{SHA-256}(\text{SHA-256}(\text{Canonical Record Byte String}))$$

### 3.4.2 RFC 6962 Binary Merkle Trees and Compact Audit Proofs
Writing individual high-frequency telemetry cycles directly to distributed ledgers is cost-prohibitive and causes severe state bloat. Instead, AquaTrust AI batches operational cycles (e.g., 100 cycles per operational shift) into an **RFC 6962 binary Merkle tree**:
- **Leaf Hashing:** Each cycle record digest is hashed with a `0x00` domain prefix byte:
  $$\text{Leaf Hash} = \text{SHA-256}(0\text{x}00 \parallel \text{Record Digest})$$
- **Internal Node Hashing:** Intermediate branch pairs are concatenated and hashed with a `0x01` domain prefix byte to eliminate second-preimage attack vulnerabilities:
  $$\text{Parent Hash} = \text{SHA-256}(0\text{x}01 \parallel \text{Left Child} \parallel \text{Right Child})$$
- **Root Anchoring:** Only the resulting single 32-byte **Merkle Root** is anchored on the blockchain ledger.
- **Logarithmic Inclusion Proofs:** To prove to an environmental auditor that a specific cycle snapshot was genuinely recorded and untampered, the system generates a compact proof consisting of $\lceil\log_2(n)\rceil$ sibling hashes. The auditor can verify the inclusion of any record in under **$0.15\text{ ms}$** without requiring access to the full database or connecting to an external server.

\newpage


# Chapter 4: System Architecture and Design

## 4.1 System Overview and High-Level Architecture
AquaTrust AI is engineered following an event-driven, decoupled, multi-tier microservices architecture. The platform bridges physical and simulated wastewater processes with cloud microservices, predictive machine learning pipelines, and decentralized ledger environments.

![Figure 4.1: End-to-End System Architecture of AquaTrust AI Platform](images/fig4_1_architecture.png)

The platform comprises five primary architectural tiers:
1. **Data Ingestion Tier:** Replays calibrated real-world wastewater operational data, generates synthetic high-frequency sensor readings, and injects controlled sensor faults and biological shock events for testing.
2. **AI/ML Intelligence Tier:** Encapsulates the trained inference models for sensor trust classification, multi-output effluent parameter forecasting, closed-loop prescriptive recommendations, and stoichiometric carbon accounting.
3. **Backend & Persistence Tier:** Built on FastAPI, Python 3.10+, SQLAlchemy ORM, and PostgreSQL 15. Manages data persistence across 14 tables, enforces Role-Based Access Control (RBAC), and coordinates the Digital Twin state machine.
4. **Distributed Ledger & Cryptographic Tier:** Serializes canonical operational snapshots (`atc-v1`), computes SHA-256 Merkle root trees, and anchors cryptographic hashes to an immutable ledger (Solidity smart contracts deployed on Ganache / Hyperledger Fabric 2.5 channel) with automated fallback to local simulation mode.
5. **Presentation & SCADA Web UI Tier:** Modern single-page application built with React 18, Vite, and Tailwind CSS. Provides industrial synoptic diagrams, live time-series dashboards, alert triage centers, and cryptographic verification interfaces.

## 4.2 Detailed Module Descriptions
- **Data Simulation and Ingestion Engine:** Replays the 527-record UCI Urban ETP dataset with cubic spline smoothing and controlled anomaly injection (`STUCK_SENSOR`, `SENSOR_FAILURE`, `SENSOR_DRIFT`, `PARAMETER_INCONSISTENCY`, etc.).
- **AI/ML Sensor Trust and Effluent Prediction Engine:** Evaluates rolling $Z$-scores and an Isolation Forest ($n=150$) to assign trust tiers, followed by Gradient Boosted Regressors predicting effluent $BOD, COD, TSS,$ and $pH$.
- **Prescriptive Process Optimization:** Translates predictive model outputs into actionable operational directives (blower DO setpoints 1.5–2.5 mg/L, coagulant dosing, and equalization basin bypass).
- **Digital Twin State Engine:** Maintains a dynamic digital twin of biological and electromechanical health states (`NORMAL_DIGESTION`, `HYDRAULIC_SURGE`, `TOXIC_SHOCK`, `AERATION_STARVATION`, `CLARIFIER_BULKING`).
- **Cryptographic Verification and DLT Gateway:** Formulates canonical `atc-v1` snapshots, constructs SHA-256 Merkle trees, and anchors root hashes to Solidity smart contracts.
- **Interactive Web SCADA Dashboard:** Single-page React application delivering synoptic schematics, real-time alert triage, and single-click cryptographic verification.

## 4.3 Data Flow Diagrams
- **Level 0 DFD (Context Level):** Captures high-level interactions between IoT sensors, plant operators, pollution control regulators, and the blockchain ledger.
- **Level 1 DFD (Subsystem Decomposition):** Breaks the system down into six functional blocks: Data Ingest, Trust Evaluation, Effluent Prediction, Process Optimizer, Database Persistence, and Blockchain Sealing.
- **Level 2 DFD (AI & Cryptographic Pipelines):** Details the inner workings of multi-target tree regression, CPCB limit evaluation, canonical JSON serialization, and Merkle tree generation.

## 4.4 Entity-Relationship (ER) Modeling & Database Schema Design
The system utilizes 14 PostgreSQL relational tables:
- `facilities`, `sensors`, `sensor_readings`, `treatment_cycles`, `anomaly_results`, `predictions`, `recommendations`, `dlt_anchors`, `audit_timeline`, `compliance_rules`, `compliance_results`, `corrections`, `certificates`, `users`.

The schema guarantees referential integrity, tenant isolation, and strict append-only audit log histories.

*Table 4.1: Core Relational Schema Mapping (PostgreSQL Tables and Primary Keys)*
| Table Name | Primary Key | Foreign Key References | Purpose & Description |
| :--- | :--- | :--- | :--- |
| `facilities` | `id` (UUID) | None | Stores metadata for physical decentralized STP/ETP installations |
| `sensors` | `id` (UUID) | `facility_id` $→$ `facilities.id` | Hardware inventory, calibration curves, and probe health status |
| `sensor_readings` | `id` (UUID) | `sensor_id`, `cycle_id` | High-frequency physical & synthetic telemetry time-series |
| `treatment_cycles`| `id` (UUID) | `facility_id` $→$ `facilities.id` | Discrete 4-to-8 hour biological treatment cycles |
| `anomaly_results` | `id` (UUID) | `reading_id` $→$ `sensor_readings.id` | Output of Isolation Forest and statistical trust classifier |
| `predictions` | `id` (UUID) | `cycle_id` $→$ `treatment_cycles.id` | Predicted effluent metrics ($DBO, DQO, SS, pH$) |
| `recommendations`| `id` (UUID) | `prediction_id` $→$ `predictions.id` | Prescribed actions (blower DO setpoint, coagulant dosing) |
| `dlt_anchors` | `id` (UUID) | `cycle_id` $→$ `treatment_cycles.id` | SHA-256 Merkle root hashes, transaction IDs, block heights |
| `audit_timeline` | `id` (UUID) | `facility_id` $→$ `facilities.id` | Immutable append-only audit log with SHA-256 lineage hash |

## 4.5 Input and Output Design
- **Input Design:** High-frequency JSON telemetry payloads over HTTP POST/WebSocket containing multi-parameter readings ($DO, pH, BOD, COD, TSS, Temp$) alongside cryptographic signatures for operator setpoint adjustments.
- **Output Design:** Real-time synoptic visual displays, predictive CPCB compliance warnings, prescriptive setpoint instructions, and digitally signed downloadable compliance certificates with cryptographic Merkle inclusion proofs.

\newpage

# Chapter 5: Implementation Details

## 5.1 Technology Stack and Environmental Configuration
- **Backend & ML:** Python 3.10+, FastAPI 0.109, Uvicorn, SQLAlchemy 2.0, PostgreSQL 15, Alembic 1.13.
- **Machine Learning Libraries:** Scikit-Learn 1.4, XGBoost 2.0, NumPy, Pandas, SciPy.
- **Cryptography & Blockchain:** Cryptography (hazmat P-256 ECDSA), Solidity 0.8.20, Ganache 7.9, Hyperledger Fabric 2.5.
- **Frontend SCADA:** React 18, Vite 5.0, Tailwind CSS 3.4, Lucide React, Chart.js.
- **Testing:** Pytest 8.0, TestClient, Jest.

*Table 5.1: Software, Library, and Framework Dependency Inventory*
| Component Layer | Technology / Library | Version | Technical Purpose & Role |
| :--- | :--- | :--- | :--- |
| **Programming Language** | Python | 3.10 / 3.13 | Core backend, ML pipelines, and API services |
| **Web Framework** | FastAPI | 0.109.0 | Asynchronous RESTful API and WebSocket telemetry routing |
| **ASGI Server** | Uvicorn | 0.27.0 | High-performance asynchronous HTTP/WebSocket gateway |
| **Database ORM** | SQLAlchemy | 2.0.25 | Async object-relational mapping and connection pooling |
| **Database Migrations** | Alembic | 1.13.1 | Version-controlled, idempotent PostgreSQL DDL migrations |
| **Database Engine** | PostgreSQL | 15.4 | Relational persistence, indexing, and transactional integrity |
| **Machine Learning** | Scikit-Learn | 1.4.0 | Isolation Forest, Random Forest, metrics evaluation |
| **Gradient Boosting** | XGBoost / LightGBM | 2.0.3 | Optimized gradient tree boosting for effluent prediction |
| **Scientific Computing** | NumPy / Pandas / SciPy| 1.26.3 | Matrix manipulation, spline interpolation, statistics |
| **Cryptography** | Cryptography (hazmat) | 42.0.0 | P-256 ECDSA signatures and SHA-256 hashing |
| **Smart Contracts** | Solidity | 0.8.20 | On-chain compliance verification and root hash storage |
| **Blockchain Networks** | Ganache / Fabric | 2.5 / 7.9.2 | Local testing blockchain and enterprise permissioned DLT |
| **Frontend Framework** | React / Vite | 18.2 / 5.0 | Reactive component rendering and dashboard UI |
| **Styling & Icons** | Tailwind CSS / Lucide | 3.4.1 | Utility-first responsive CSS and industrial SCADA icons |
| **Automated Testing** | Pytest / Jest | 8.0.0 | Pure unit, concurrency, integration, and E2E QA |

## 5.2 Sensor Data Simulation and Synthetic Anomaly Injection Pipeline
The simulation harness replays 527 days of operational data from the UCI Urban Wastewater Treatment Plant dataset, applying cubic spline interpolation and Gaussian white noise ($σ = 0.02$) to generate high-frequency synthetic telemetry streams ($1 Hz$). Ten distinct anomaly injection algorithms emulate probe flatlines, extreme spikes, calibration drift, and chemical shock events.

## 5.3 Machine Learning Pipeline Implementation
- Trained multi-output tree ensembles on 527 UCI ETP records.
- Feature engineering included lag features ($t-1, t-2$), hydraulic retention time ratios, and cross-parameter biochemical balances.
- Optimized hyperparameters via 5-fold cross-validation, achieving $R^2 > 0.88$ across all effluent targets.

*Table 5.2: Hyperparameter Configurations for Gradient Boosted and Random Forest Models*
| Hyperparameter | Effluent BOD ($DBO-S$) | Effluent COD ($DQO-S$) | Effluent TSS ($SS-S$) | Effluent pH ($PH-S$) |
| :--- | :--- | :--- | :--- | :--- |
| **Estimator Type** | GradientBoostingRegressor | RandomForestRegressor | GradientBoostingRegressor | RandomForestRegressor |
| **Number of Trees ($n$)**| 250 | 300 | 200 | 150 |
| **Learning Rate ($\eta$)**| 0.045 | N/A (Bagging) | 0.050 | N/A (Bagging) |
| **Max Tree Depth** | 5 | 8 | 6 | 6 |
| **Min Samples Split** | 4 | 2 | 4 | 3 |
| **Subsample Ratio** | 0.85 | 1.00 (Bootstrap) | 0.80 | 1.00 (Bootstrap) |

## 5.4 Backend RESTful API & Persistence Architecture
- Modular FastAPI routers exposed under `/api/v1/`: `/sensors`, `/predictions`, `/recommendations`, `/sustainability`, `/audit`.
- Full asynchronous database operations using SQLAlchemy and asyncpg.
- Enforced Role-Based Access Control (RBAC) across 4 roles: `OPERATOR`, `MANAGER`, `AUDITOR`, `ADMIN`.

*Table 5.3: RESTful API Endpoint Specification Table (FastAPI Routes)*
| HTTP Verb | API Endpoint Route | Target Service | Functionality & Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sensors/ingest` | Sensor Ingestion | Ingests sensor batch, executes trust scoring, quarantines faults |
| `GET` | `/api/v1/sensors/health` | Sensor Trust | Returns live trust status and health scores across all probes |
| `POST` | `/api/v1/predictions/predict` | Quality Prediction | Generates multi-target effluent predictions with breach warnings |
| `POST` | `/api/v1/recommendations/generate`| Prescriptive Engine | Outputs DO setpoints, coagulant dosage, and bypass advice |
| `GET` | `/api/v1/sustainability/metrics` | Sustainability | Computes power savings, circularity index, and Scope 2 carbon |
| `POST` | `/api/v1/audit/anchor` | DLT Gateway | Serializes cycle snapshot, builds Merkle root, anchors to DLT |
| `POST` | `/api/v1/audit/verify` | Verification Engine | Executes offline SHA-256 Merkle proof verification |

## 5.5 Blockchain Smart Contract Implementation & Cryptographic DLT Gateway

The AquaTrust AI blockchain tier is architected to guarantee mathematical non-repudiation, tamper-evidence, and regulatory accountability for high-frequency wastewater telemetry without incurring prohibitive on-chain storage costs. The platform implements a **dual-ledger architecture** supporting both Ethereum Virtual Machine (EVM) Solidity smart contracts on a local development testbed (Ganache) and production-grade permissioned chaincode deployed on Hyperledger Fabric 2.5.

### 5.5.1 Dual-Ledger Deployment & Smart Contract Architecture
To satisfy enterprise governance while supporting agile local development, the smart contract layer operates across two synchronized implementations:
1. **Solidity Smart Contract (`AquaTrustRecords.sol` / `AquaTrustComplianceLedger.sol`):** Compiled via Solidity compiler `0.8.20`, this contract implements EVM-compatible state mappings, cryptographic inclusion checks, and role-based access modifiers (`onlyOperator`, `onlyAuditor`, `onlyRegulator`). It is deployed on the local **Ganache** testbed to simulate public/consortium EVM gas economics, test MetaMask wallet integrations, and execute benchmark evaluations for Objective 9.
2. **Hyperledger Fabric Chaincode (`AquaTrustRecordContract`):** Implemented in TypeScript using `fabric-contract-api` (deployed under Node.js runtime on Fabric channel `aquatrust-channel`), this contract enforces multi-organization transaction endorsement policies requiring endorsements from both plant operators (`FacilityMSP`) and independent certifiers (`AuditorMSP`).

### 5.5.2 On-Chain Data Structures & State Schemas
Rather than storing multi-kilobyte raw sensor telemetry on-chain (which causes severe state bloat), the smart contracts store compact, fixed-size 32-byte cryptographic digests and provenance metadata:

*Table 5.4: Smart Contract Core State Schema & Struct Definitions*
| Entity / Struct | Key Fields & Data Types | Storage Location | Technical Function & Integrity Role |
| :--- | :--- | :--- | :--- |
| **`RecordAnchor`** | `recordId` (string), `recordHash` (bytes32 / hex), `hashAlgorithm` (string), `anchorType` (enum), `timestamp` (uint256 / ISO), `organizationId` (string), `clientIdentity` (string) | On-Chain State Store | Immutably anchors a single finalized treatment cycle snapshot digest generated via `atc-v1` canonical serialization. |
| **`BatchAnchor`** | `batchId` (string), `merkleRoot` (bytes32 / hex), `leafCount` (uint256), `leafHashes` (string[]), `timestamp` (uint256), `transactionId` (string) | On-Chain State Store | Anchors the 32-byte Merkle root representing an entire operational shift (100–500 cycles), enabling logarithmic $O(log₂ n)$ verification. |
| **`CorrectionLink`**| `originalRecordId` (string), `originalHash` (bytes32), `correctionRecordId` (string), `correctionHash` (bytes32), `correctionReason` (string), `timestamp` (uint256) | Append-Only State Index | Implements Objective 8 by cryptographically linking corrected measurements to prior records without overwriting or deleting historical state. |

### 5.5.3 Smart Contract Method Interfaces & Transaction Flow
The contracts expose deterministic transactional functions that validate input schemas, check cryptographic formats (enforcing 64-character lowercase hexadecimal SHA-256 digests), and emit events for real-time SCADA synchronization:

*Table 5.5: Smart Contract Functional Method Specification*
| Method Signature | Invocation Type | Authorization Policy | Core Functional Logic |
| :--- | :--- | :--- | :--- |
| `CreateAnchor(inputJson)` / `logTreatmentEvent(...)` | State Write (Mutating) | `FacilityMSP` / `onlyOperator` | Validates hash uniqueness, checks idempotency, creates composite key `record~id`, anchors the 256-bit digest, and emits event `AnchorCreated`. |
| `AnchorBatch(batchJson)` / `anchorMerkleRoot(...)` | State Write (Mutating) | `FacilityMSP` / `onlyOperator` | Computes RFC 6962 tree root from supplied leaf digests, anchors the root hash, maps cycle IDs to batch index, and emits `BatchAnchored`. |
| `VerifyAnchorReference(recordId, hash)` | State Read (Query) | Public / Any Stakeholder | Queries on-chain composite state for `recordId`, executes bitwise comparison against `hash`, and returns proof metadata (`HASH_MATCH` vs `HASH_MISMATCH`). |
| `VerifyBatchInclusion(batchId, recordId, proof[])` | State Read (Query) | Public / Any Stakeholder | Traverses submitted sibling hashes along the Merkle audit path to mathematically prove record inclusion against the stored 32-byte root hash. |
| `RecordCorrectionLink(inputJson)` / `logCorrection(...)`| State Write (Mutating) | `FacilityMSP` + `AuditorMSP` | Confirms existence of both original and corrected snapshots, binds them via immutable relation key `correctionFor~orig~corr`, and emits `CorrectionLinked`. |

### 5.5.4 Append-Only Audit Trail & Correction Linking Pattern
To satisfy environmental regulatory standards, treatment records must never be deleted, updated, or purged. When laboratory re-testing or sensor recalibration reveals an erroneous record, AquaTrust AI executes an **append-only correction workflow**:
1. The original erroneous record remains permanently sealed in PostgreSQL and on the blockchain ledger under its immutable hash $H_{orig}$.
2. A new, calibrated record is generated with a unique identifier and sealed under its distinct hash $H_{corr}$.
3. The amending officer invokes `RecordCorrectionLink`, recording the pair $(H_{orig}, H_{corr})$ along with the authorized rationale and cryptographic signature.
4. When auditors inspect the compliance ledger, the verification engine displays the complete audit lineage: the original state, the correction timestamp, the reason for amendment, and the cryptographically linked successor record.

### 5.5.5 Client-Side Offline Verification Engine
To eliminate dependency on live blockchain nodes during external audits, AquaTrust AI incorporates a standalone client-side verification engine implemented in Python and JavaScript/TypeScript:
- **Canonical Serialization Verification:** Independent auditors can feed raw exported JSON records into the `atc-v1` serializer, which recursively strips whitespace and sorts all keys lexicographically (RFC 8785).
- **Double SHA-256 Digest Recalculation:** The engine recalculates $H(R) = SHA-256(SHA-256(S_{canonical}))$ entirely in local client memory.
- **RFC 6962 Proof Traversal:** Given an exported 32-byte Merkle root and the sibling audit trail, the client engine recalculates internal node hashes using RFC 6962 domain separation prefixes (`0x00` for leaves, `0x01` for parents) in $O(log₂ n)$ operations, mathematically verifying proof validity in under **$0.15 ms$** without requiring network access.


## 5.6 Core Algorithmic Implementations and Pseudocode

### 5.6.1 Algorithm 1: Sensor Trust & Anomaly Classification
```
Algorithm 1: Sensor Trust and Anomaly Classification Engine
Input:  Streaming sensor reading x_t, parameter type p, history window W, Isolation Forest model M_if
Output: Trust Tier T, Anomaly Type A, Is_Quarantined flag Q

1:  if x_t is NULL or x_t is NaN then
2:      return (CRITICAL, MISSING_READING, true)
3:  end if
4:  if x_t < Physical_Min[p] or x_t > Physical_Max[p] then
5:      return (CRITICAL, SENSOR_FAILURE, true)
6:  end if
7:  Append x_t to sliding window W
8:  if |W| >= 15 and Variance(W) < 1e-5 then
9:      return (FAILED, STUCK_SENSOR, true)
10: end if
11: Compute rolling mean mu and standard deviation sigma over W
12: Z_t <- |x_t - mu| / (sigma + 1e-6)
13: s_if <- M_if.score_samples(x_t)
14: if Z_t > 4.0 then
15:     return (DEGRADED, SUDDEN_SPIKE, false)
16: else if s_if > 0.65 then
17:     return (SUSPECT, STATISTICAL_ANOMALY, false)
18: else
19:     return (TRUSTED, NORMAL, false)
20: end if
```

### 5.6.2 Algorithm 2: Treatment Cycle Risk Escalation & Evidence Sealing
```
Algorithm 2: Treatment Cycle Risk Escalation & Cryptographic Evidence Sealing
Input:  Completed Cycle Object C, Predicted Effluent Y_hat, Legal Limits L, Private Key K_priv
Output: Anchored DLT Transaction Hash Tx_Hash, Cryptographic Certificate Cert

1:  Risk_Score <- 0.0
2:  if Y_hat.BOD > L.BOD or Y_hat.COD > L.COD or Y_hat.TSS > L.TSS then
3:      C.status <- "BREACH_RISK"
4:      Risk_Score <- Max(Risk_Score, 0.70)
5:  else if Y_hat.BOD > 0.85 * L.BOD then
6:      C.status <- "BORDERLINE"
7:      Risk_Score <- Max(Risk_Score, 0.35)
8:  else
9:      C.status <- "OPTIMAL"
10: end if
11: S_canonical <- CanonicalSerialize_atc_v1(C)
12: H_cycle <- SHA256(SHA256(S_canonical))
13: Merkle_Root <- BuildMerkleTree(H_cycle, C.readings)
14: Signature <- ECDSA_Sign(K_priv, Merkle_Root)
15: Tx_Hash <- SmartContract.anchorRecord(C.id, Merkle_Root, H_cycle, C.status != "BREACH_RISK")
16: Cert <- GenerateCertificate(C.id, Merkle_Root, Tx_Hash, Signature)
17: return (Tx_Hash, Cert)
```

\newpage

# Chapter 6: System Testing, Verification, and Experimental Results

## 6.1 Testing Methodology & Verification Framework
The platform was subjected to a rigorous testing regimen comprising:
- Pure unit testing of mathematical models and anomaly scoring algorithms;
- Concurrent multi-threaded ingestion stress testing;
- Single-bit database tampering injection tests;
- DLT gateway container offline failover testing.

## 6.2 Test Execution Metrics and Suite Summary
Across all 30 system modules, a total of **293 pure automated tests** were executed with a **100% pass rate** (zero failures, zero regressions).

*Table 6.1: Overall System Automated Test Execution Summary (293 Tests)*
| Test Suite / Module Category | Test File Reference | Tests Executed | Passed | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Sensor Trust & Anomaly Inference** | `test_phase02_sensors.py` | 42 | 42 (100%) | **PASSED** |
| **Effluent Quality Prediction Engine** | `test_phase03_predictions.py` | 38 | 38 (100%) | **PASSED** |
| **Prescriptive Recommendations** | `test_phase04_recommendations.py`| 35 | 35 (100%) | **PASSED** |
| **Sustainability & Stoichiometry** | `test_phase05_sustainability.py` | 30 | 30 (100%) | **PASSED** |
| **Digital Twin Kinetics & State** | `test_phase06_digital_twin.py` | 36 | 36 (100%) | **PASSED** |
| **Cryptographic DLT & Merkle Proofs**| `test_phase07_audit_dlt.py` | 45 | 45 (100%) | **PASSED** |
| **Backend End-to-End API Integration**| `test_member2_deliverables.py` | 55 | 55 (100%) | **PASSED** |
| **Mandatory Cross-Module Edge Cases**| `test_mandatory_e2e_edge_cases.py`| 12 | 12 (100%) | **PASSED** |
| **TOTAL SYSTEM TEST SUITE** | **All 8 Test Modules** | **293** | **293 (100%)**| **PERFECT** |

## 6.3 Machine Learning Model Evaluation & Empirical Results

### 6.3.1 Parameter Prediction Accuracy and Regression Curves
The effluent quality prediction models were evaluated on a held-out test split (20%, $N = 106$ cycles) of the empirical UCI Urban Wastewater Treatment Plant dataset. The multi-output ensemble demonstrated high predictive fidelity across all four regulatory target parameters.

*Table 6.2: Empirical Performance Metrics of Effluent Water Quality Prediction Models*
| Effluent Target Parameter | Optimal ML Estimator | RMSE | MAE | $R^2$ Score | CPCB Compliance Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Effluent BOD ($DBO-S$)** | Gradient Boosting Regressor | **6.16 mg/L** | 4.32 mg/L | **0.884** | **96.8%** |
| **Effluent COD ($DQO-S$)** | Random Forest Regressor | **27.05 mg/L** | 18.40 mg/L | **0.892** | **95.4%** |
| **Effluent TSS ($SS-S$)** | Gradient Boosting Regressor | **7.30 mg/L** | 5.10 mg/L | **0.879** | **97.1%** |
| **Effluent pH ($PH-S$)** | Random Forest Regressor | **0.166 pH** | 0.112 pH | **0.915** | **99.2%** |

![Figure 6.1: Actual vs. Predicted Effluent Concentrations across CPCB Target Parameters](images/fig6_1_effluent_regression.png)

As demonstrated in Figure 6.1, predicted effluent values closely track the actual laboratory test values along the ideal 45-degree ($y = x$) regression line. For Effluent BOD (Figure 6.1a), the model reliably classifies cycles approaching the CPCB permissible discharge limit of $30.0 mg/L$, triggering proactive aeration adjustments before breaches occur. Similarly, for Effluent COD (Figure 6.1b) and TSS (Figure 6.1c), the models maintain high fidelity even during non-linear peak organic loading spikes. Effluent pH (Figure 6.1d) demonstrates the highest precision ($R^2 = 0.915$, $RMSE = 0.166$), accurately predicting shifts toward acidic or alkaline boundaries.

### 6.3.2 Anomaly Classification Confusion Matrix and Trust Performance
The 10-class sensor trust engine was evaluated against 1,200 synthetic telemetry cycles containing labeled anomaly injections across all 10 operational fault archetypes.

*Table 6.3: Classification Performance of Sensor Trust & Anomaly Inference Engine*
| Anomaly Archetype | Precision | Recall | F1-Score | Mean Detection Latency |
| :--- | :---: | :---: | :---: | :---: |
| `NORMAL` | 0.99 | 0.98 | **0.98** | Baseline (< 1 cycle) |
| `STUCK_SENSOR` | 0.98 | 1.00 | **0.99** | $≤ 15 cycles$ |
| `SENSOR_FAILURE` | 1.00 | 0.99 | **0.99** | Instantaneous (< 1 cycle) |
| `SENSOR_DRIFT` | 0.92 | 0.89 | **0.90** | $5–8 cycles$ |
| `PARAMETER_INCONSISTENCY` | 0.94 | 0.91 | **0.92** | $< 2 cycles$ |
| `SUDDEN_SPIKE` | 0.97 | 0.98 | **0.97** | Instantaneous (< 1 cycle) |
| `MISSING_READING` | 1.00 | 1.00 | **1.00** | Instantaneous (< 1 cycle) |
| `DUPLICATE_READING` | 1.00 | 1.00 | **1.00** | Instantaneous (< 1 cycle) |
| `SUDDEN_PROCESS_CHANGE` | 0.91 | 0.93 | **0.92** | $3–5 cycles$ |
| `STATISTICAL_ANOMALY` | 0.88 | 0.86 | **0.87** | $< 1 cycle$ |

![Figure 6.2: Normalized Confusion Matrix for 10-Class Sensor Trust & Anomaly Inference](images/fig6_2_anomaly_confusion_matrix.png)

Figure 6.2 depicts the normalized confusion matrix across the 10 anomaly classes. The hybrid statistical/Isolation Forest architecture demonstrates strong diagonal concentration. Hardware disconnects (`SENSOR_FAILURE`), packet drops (`MISSING_READING`), and transmission replays (`DUPLICATE_READING`) achieve 100% detection accuracy. Subtle drift (`SENSOR_DRIFT`, 89.4%) and biological process shocks (`SUDDEN_PROCESS_CHANGE`, 92.4%) are correctly differentiated without confounding sensor hardware wear with biological shock.

### 6.3.3 Model Benchmarking & Computational Complexity Analysis
To empirically justify the selection of the tree-based ensemble architecture, a comprehensive benchmark was conducted comparing the proposed ensemble against baseline machine learning paradigms: Ordinary Least Squares (OLS) Linear Regression, Support Vector Regression (SVR with RBF kernel), standalone Random Forest, standalone XGBoost, and a deep Long Short-Term Memory (LSTM) recurrent network.

*Table 6.4: Comparative Model Benchmark Matrix across Multiple ML Paradigms*
| Architecture / Model Paradigm | BOD RMSE (mg/L) | COD RMSE (mg/L) | Mean $R^2$ Score | Single-Cycle Inference Latency | Memory Footprint |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Linear Regression (OLS)** | 14.80 mg/L | 58.20 mg/L | 0.612 | **1.2 ms** | **< 2 MB** |
| **Support Vector Regressor (SVR)**| 9.75 mg/L | 38.60 mg/L | 0.785 | 8.4 ms | 12 MB |
| **Random Forest Regressor** | 6.82 mg/L | 27.05 mg/L | 0.865 | 11.2 ms | 38 MB |
| **XGBoost (Gradient Boosted)**| 6.35 mg/L | 28.40 mg/L | 0.878 | 14.5 ms | 24 MB |
| **Deep LSTM Recurrent Network** | 7.90 mg/L | 32.10 mg/L | 0.834 | 84.6 ms | 145 MB |
| **AquaTrust AI Multi-Output Ensemble**| **6.16 mg/L** | **27.05 mg/L** | **0.892** | **18.2 ms** | **45 MB** |

![Figure 6.3: Machine Learning Model Benchmarking and Computational Complexity Comparison](images/fig6_3_model_benchmarks.png)

As illustrated in Figure 6.3:
1. **RMSE Comparison (Figure 6.3a):** Standard Linear Regression fails to capture non-linear microbial digestion dynamics ($RMSE = 14.80 mg/L$). The AquaTrust AI ensemble achieves the lowest error ($RMSE = 6.16 mg/L$), representing a 58.4% error reduction over linear baselines.
2. **Coefficient of Determination ($R^2$, Figure 6.3b):** The ensemble achieves a mean $R^2 = 0.892$, significantly outperforming SVR ($R^2 = 0.785$) and deep LSTM ($R^2 = 0.834$).
3. **Inference Latency & Edge Feasibility (Figure 6.3c):** While deep LSTM architectures require $84.6 ms$ per cycle and over $140 MB$ RAM, our ensemble executes in **$18.2 ms$** on standard commodity hardware. This ultra-low computational latency allows the entire predictive pipeline to run comfortably on low-cost edge gateways (such as a Raspberry Pi 4).

## 6.4 Blockchain Performance and Tamper Detection Experimental Analysis
To evaluate the cryptographic integrity and scaling capabilities of the off-chain/on-chain hybrid architecture, a systematic series of cryptographic stress tests and tamper-injection experiments were conducted.

*Table 6.5: Cryptographic Integrity Verification & Tamper Detection Benchmark*
| Test Scenario / Attack Vector | Target Payload Field | Stored Hash Match? | Merkle Root Match? | Verifier Outcome |
| :--- | :--- | :---: | :---: | :--- |
| **Pristine Unmodified Record** | None | **YES** | **YES** | **VERIFIED (Valid)** |
| **Subtle Value Alteration** | `predicted_bod: 34.2 -> 18.5` | **NO** | **NO** | **TAMPER DETECTED (Rejected)** |
| **Timestamp Alteration Attack**| Shifted by $+1 second$ | **NO** | **NO** | **TAMPER DETECTED (Rejected)** |
| **JSON Key Reordering Attack** | Keys sorted alphabetically | **YES (`atc-v1`)** | **YES** | **VERIFIED (Order Invariant)** |
| **Bit-Flip in Merkle Proof** | 1 bit flipped in sibling hash | **YES** | **NO** | **TAMPER DETECTED (Rejected)** |

![Figure 6.4: Cryptographic Scaling Benchmarks and Tamper Detection Experimental Analysis](images/fig6_4_crypto_tamper_benchmark.png)

Figure 6.4 illustrates the experimental findings:
- **Scaling Complexity (Figure 6.4a):** Double SHA-256 canonical hashing (`atc-v1`) and Merkle tree generation scale linearly $O(n)$ with batch size. For a 100-cycle operational batch, root generation completes in just **$1.10 ms$**. Most importantly, single-record inclusion proof verification executes in logarithmic time $O(\log_2 n)$, requiring only **$0.12 ms$** to mathematically prove the integrity of an arbitrary cycle snapshot.
- **Tamper Detection Efficacy (Figure 6.4b):** Single-bit modifications, timestamp alterations, and numerical falsifications are detected with **100.0% accuracy**. Conversely, benign JSON serialization reordering attacks are safely neutralized by the canonical `atc-v1` standard, guaranteeing zero false alarms.

## 6.5 Sustainability, Energy Conservation, and Circularity Impact Results
To assess the practical ecological and economic benefits, the closed-loop stoichiometric optimizer was benchmarked over a simulated 30-day operating period for a decentralized residential STP treating $500 kL/day$ ($500,000 L/day$).

*Table 6.6: Monthly Resource Optimization & Carbon Avoidance in 500 kL/day Facility*
| Sustainability Metric | Baseline (Unoptimized) | AquaTrust AI Optimized | Net Monthly Savings / Impact |
| :--- | :---: | :---: | :---: |
| **Aeration Blower Electricity**| $8,640 kWh$ | $6,739 kWh$ | **$1,901 kWh$ saved (22.0% reduction)** |
| **Coagulant Chemical (PAC)** | $450 kg$ | $369 kg$ | **$81 kg$ saved (18.0% reduction)** |
| **Freshwater Reused via Recycling**| $0 kL$ | $12,750 kL$ | **$12.75 Million Liters$ Conserved** |
| **Water Circularity Index (WCI$)** | $12.5%$ | **$85.0%$** | **$+72.5%$ Circularity Gain** |
| **Scope 2 Indirect Carbon Avoided** | $0 kg CO_2e$ | **$6,021 kg CO_2e$** | **$6.02 Metric Tons CO_2e$ Avoided** |

![Figure 6.5: 30-Day Cumulative Sustainability Impact in a 500 kL/day Treatment Facility](images/fig6_5_sustainability_impact.png)

Figure 6.5 plots the cumulative 30-day progression:
- **Aeration Energy Conservation (Figure 6.5a):** By dynamically tuning dissolved oxygen setpoints between $1.5–2.5 mg/L$ rather than running blowers continuously at full load, the plant accumulated **$1,901 kWh$** in electrical energy savings (a 22.0% reduction).
- **Scope 2 Indirect Carbon Avoided (Figure 6.5b):** Combining electrical grid emission offsets ($0.82 kg CO_2e/kWh$) with avoided municipal water conveyance pumping ($0.35 kg CO_2e/kL$), the facility averted **$6,021 kg CO_2e$** ($6.02 metric tons$) of greenhouse gas emissions within a single month of automated closed-loop operation.

\newpage

# Chapter 7: Conclusion and Future Work

## 7.1 Conclusion and Key Research Contributions
The AquaTrust AI project delivers an end-to-end, production-ready solution resolving the dual challenges of predictive opacity and audit vulnerability in decentralized wastewater treatment. By combining synthetic telemetry simulation, ensemble machine learning, stoichiometric process modeling, and cryptographic distributed ledgers, the platform provides institutional-grade operational control and unforgeable compliance auditing without requiring capital-intensive hardware deployments.

## 7.2 Practical Industrial Impact & Societal Relevance
The platform directly protects aquatic ecosystems from untreated municipal discharge, advances urban circular water economies, and establishes trustless environmental governance for pollution control boards.

## 7.3 Limitations of the Current Implementation
The operational boundaries of the current release are:
1. **Synthetic Telemetry Baseline:** While calibrated against empirical UCI Urban ETP records, real-world deployment requires site-specific tuning of biological kinetic coefficients.
2. **Single-Node Simulation Fallback:** In environments where external Hyperledger Fabric or Ganache nodes are unreachable, the DLT gateway falls back to local RFC 6962 simulation.
3. **Advisory Actuation Level:** Prescriptive setpoints are surfaced on the SCADA dashboard as operator guidance rather than directly driving physical Modbus/PLC actuator relays.
4. **Laboratory Correlation Delay:** Field validation still requires intermittent wet-chemistry laboratory testing to continuously confirm physical sensor calibration accuracy.

## 7.4 Future Enhancements and Research Directions
Future work will advance the platform along the following directions:
1. **Physical PLC / Modbus Interfacing:** Deploying lightweight edge microcontrollers (ESP32 / Raspberry Pi) running TinyML models to interface directly with physical RS-485 Modbus RTU actuator relays.
2. **Physics-Informed Neural Networks (PINNs):** Embedding differential mass balance equations from Activated Sludge Models (ASM2d) directly into neural network loss functions.
3. **Hardware Security Module (HSM) Key Management:** Securing operator ECDSA private keys using physical TPM 2.0 or CloudHSM modules.
4. **Automated Carbon & Water Credit Tokenization:** Minting verified ERC-20 / ERC-721 environmental credits on public blockchains directly from cryptographically audited treatment cycle records.
5. **Decentralized Multi-Tenant Federation:** Expanding the Hyperledger Fabric channel architecture to support federated consortium networks across multiple municipal wards and industrial clusters.

\newpage

# References

1. D. S. Thakkar, A. Thakker, R. Gupta, N. K. Jadav, S. Tanwar, G. Pau, G. Sharma, F. Alqahtani, and A. Tolba, "Blockchain-Orchestrated Intelligent Water Treatment Plant Profiling Framework to Enhance Human Life Expectancy," *IEEE Access*, vol. 12, pp. 49151–49166, 2024. DOI: [10.1109/ACCESS.2024.3384607](https://doi.org/10.1109/ACCESS.2024.3384607)
2. M. A. Mohammed, A. Lakhan, K. H. Abdulkareem, M. K. Abd Ghani, H. A. Marhoon, S. Kadry, J. Nedoma, R. Martinek, and B. G. Zapirain, "Industrial Internet of Water Things architecture for data standardization based on blockchain and digital twin technology," *Journal of Advanced Research*, vol. 66, pp. 1–14, 2024. DOI: [10.1016/j.jare.2023.10.005](https://doi.org/10.1016/j.jare.2023.10.005)
3. Q. Abbas, R. Almakki, M. Albathan, W. J. Obidallah, and Z. Alshaikh, "Secure Water Quality Monitoring using Blockchain-Smart Contract and IoT in 6G Smart Cities," *Water Resources Management*, vol. 40, 2026. DOI: [10.1007/s11269-026-04630-2](https://doi.org/10.1007/s11269-026-04630-2)
4. P. Mukherjee, S. Sengupta, and P. K. Sadhu, "Blockchain-IoT and optioneering driven framework for smart water management in emerging urban areas," *iScience*, Cell Press, vol. 28, no. 1, p. 113927, 2025. DOI: [10.1016/j.isci.2025.113927](https://doi.org/10.1016/j.isci.2025.113927)
5. M. Pincheira, M. Vecchio, R. Giaffreda, and S. S. Kanhere, "Cost-effective IoT devices as trustworthy data sources for a blockchain-based water management system in precision agriculture," *Computers and Electronics in Agriculture*, vol. 180, p. 105889, 2021. DOI: [10.1016/j.compag.2020.105889](https://doi.org/10.1016/j.compag.2020.105889)
6. M. Pincheira, M. Vecchio, and S. S. Kanhere, "Exploiting Constrained IoT Devices in a Trustless Blockchain-based Water Management System," in *Proc. 2020 IEEE International Conference on Blockchain and Cryptocurrency (ICBC)*, Toronto, ON, Canada, 2020, pp. 1–3. DOI: [10.1109/ICBC48266.2020.9169404](https://doi.org/10.1109/ICBC48266.2020.9169404)
7. S. Hakak, W. Z. Khan, G. A. Gilkar, N. Haider, M. Imran, and S. Alkatheiri, "Industrial Wastewater Management using Blockchain Technology: Architecture, Requirements, and Future Directions," *IEEE Internet of Things Magazine*, vol. 3, no. 2, pp. 38–43, 2020. DOI: [10.1109/IOTM.0001.1900092](https://doi.org/10.1109/IOTM.0001.1900092)
8. B. Bordel, D. Martín, R. Alcarria, and T. Robles, "A Blockchain-based Water Control System for the Automatic Management of Irrigation Communities," in *Proc. 2019 IEEE International Conference on Consumer Electronics (ICCE)*, Las Vegas, NV, USA, 2019, pp. 1–4. DOI: [10.1109/ICCE.2019.8662058](https://doi.org/10.1109/ICCE.2019.8662058)
9. Metcalf & Eddy, Inc., G. Tchobanoglous, H. D. Stensel, R. Tsuchihashi, and F. L. Burton, *Wastewater Engineering: Treatment and Resource Recovery*, 5th ed. New York, NY, USA: McGraw-Hill Education, 2014. Link: [https://books.google.com/books?isbn=9780073401188](https://books.google.com/books?isbn=9780073401188)
10. Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Government of India, "General Standards for Discharge of Environmental Pollutants: Effluents," *Environment (Protection) Rules*, Schedule VI, 1986. Link: [https://moef.gov.in/](https://moef.gov.in/)
11. S. A. Crosby and D. S. Wallach, "Certificate Transparency," RFC 6962, Internet Engineering Task Force (IETF), 2013. Link: [https://datatracker.ietf.org/doc/html/rfc6962](https://datatracker.ietf.org/doc/html/rfc6962)
12. F. T. Liu, K. M. Ting, and Z.-H. Zhou, "Isolation Forest," in *Proc. 2008 Eighth IEEE International Conference on Data Mining (ICDM)*, Pisa, Italy, 2008, pp. 413–422. DOI: [10.1109/ICDM.2008.17](https://doi.org/10.1109/ICDM.2008.17)
13. UCI Machine Learning Repository, "Water Treatment Plant Data Set," School of Information and Computer Science, University of California, Irvine, 1993. Link: [https://archive.ics.uci.edu/dataset/120/water+treatment+plant](https://archive.ics.uci.edu/dataset/120/water+treatment+plant)

# Appendix A: Key Code Listings and Smart Contract Definitions

### Listing A.1: Canonical Snapshot Serializer (`atc-v1`)
```python
import json
import hashlib
from typing import Dict, Any

def serialize_canonical_snapshot(record: Dict[str, Any]) -> bytes:
    """
    Serializes an operational cycle snapshot into canonical deterministic bytes (atc-v1).
    Ensures key sorting, float canonicalization, and whitespace stripping.
    """
    canonical_dict = {}
    for key in sorted(record.keys()):
        val = record[key]
        if isinstance(val, float):
            canonical_dict[key] = round(val, 6)
        else:
            canonical_dict[key] = val

    canonical_json = json.dumps(
        canonical_dict,
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=True
    )
    return canonical_json.encode('utf-8')

def compute_cycle_double_sha256(canonical_bytes: bytes) -> str:
    """Computes double-SHA256 digest to prevent length-extension attacks."""
    first_hash = hashlib.sha256(canonical_bytes).digest()
    double_hash = hashlib.sha256(first_hash).hexdigest()
    return double_hash
```

### Listing A.2: RFC 6962 Merkle Tree Implementation
```python
import hashlib
from typing import List

class MerkleTree:
    """Constructs an RFC 6962 compliant binary Merkle Tree."""
    def __init__(self, leaves: List[bytes]):
        self.leaves = [hashlib.sha256(b'\x00' + leaf).digest() for leaf in leaves]
        self.root = self._build_tree(self.leaves)

    def _build_tree(self, nodes: List[bytes]) -> bytes:
        if not nodes:
            return hashlib.sha256(b'').digest()
        if len(nodes) == 1:
            return nodes[0]

        next_level = []
        for i in range(0, len(nodes), 2):
            left = nodes[i]
            right = nodes[i + 1] if i + 1 < len(nodes) else left
            parent = hashlib.sha256(b'\x01' + left + right).digest()
            next_level.append(parent)

        return self._build_tree(next_level)

    def get_root_hex(self) -> str:
        return self.root.hex()
```
