import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3
)

parser = StrOutputParser()


async def answer_question(rfp_text: str, question: str) -> str:
    """
    Builds a RAG retriever from the RFP text
    and answers the user's question using only
    the RFP content.
    """

    # Step 1: Split RFP into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.create_documents([rfp_text])

    # Step 2: Store in ChromaDB
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    # Step 3: Find relevant chunks for the question
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 4}
    )
    docs = retriever.invoke(question)
    context = "\n\n".join([doc.page_content for doc in docs])

    # Step 4: Answer the question
    prompt = ChatPromptTemplate.from_template("""
    You are an RFP analyst. Answer the user's question
    based ONLY on the RFP content provided below.

    If the answer is not in the RFP, say:
    "This information is not mentioned in the RFP."

    RFP CONTENT:
    {context}

    USER QUESTION:
    {question}

    Give a clear, direct answer in 2-3 sentences.
    """)

    chain = prompt | llm | parser
    answer = await chain.ainvoke({
        "context": context,
        "question": question
    })

    return answer