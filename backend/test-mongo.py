import os
import ssl
import certifi

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

print("OpenSSL:", ssl.OPENSSL_VERSION)
print("CA:", certifi.where())

uri = os.environ["MONGODB_URI"]

client = MongoClient(
    uri,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=10000,
)

print("Pinging Atlas...")

client.admin.command("ping")

print("SUCCESS: MongoDB Atlas connected")