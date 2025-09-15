from langfuse import Langfuse
from langfuse.langchain import CallbackHandler
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_community.llms import Ollama

# Initialize Langfuse
langfuse = Langfuse(
    public_key="pk-lf-624260af-0dfa-40c5-8885-ece6c86cb446",
    secret_key="sk-lf-2ef8c0a8-3300-4883-83f3-8a797908437d",
    host="http://localhost:3000"
)

# Create a Langfuse callback handler
langfuse_handler = CallbackHandler()

# Initialize Ollama LLM
llm = Ollama(model="qwen3:0.6b")

# Create a simple prompt template
prompt = PromptTemplate(
    input_variables=["question"],
    template="Answer the following question: {question}"
)

# Create a simple LLM chain
chain = LLMChain(llm=llm, prompt=prompt)

# Invoke the chain with Langfuse callback
response = chain.invoke(
    {"question": "What is Large Language Model (LLM)?"}, 
    config={"callbacks": [langfuse_handler]}
)

print("Response:", response['text'])
