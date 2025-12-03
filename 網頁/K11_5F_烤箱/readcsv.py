import pandas as pd

path = r"\\20220530-w03\Data\K11_5F_BAKE\202508\MySQL_0818.csv"
df = pd.read_csv(path)
print(df)