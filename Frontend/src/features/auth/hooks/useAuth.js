import { useContext } from "react";
import { AuthContext } from "../auth.context";
import {login, register, logout, getMe} from "../services/auth.api";
import { use } from "react";
import { useEffect } from "react";


export const useAuth = () =>{

    const context = useContext(AuthContext)
    const {user, setUser, loading, setLoading, error, setError} = context

    const handleLogin = async({email,password}) =>{
        setLoading(true)
        setError(null)
        try{
            const data = await login({email,password})
            setUser(data.user)
        }
        catch(err){
            setError(err)
        }
        finally{
            setLoading(false)
        }
    }

    const handleRegister = async({username,email,password}) =>{
        setLoading(true)
        setError(null)
        try{
            const data = await register({username,email,password})
            setUser(data.user)
        }
        catch(err){
            setError(err)
        }
        finally{
            setLoading(false)
        }
        
    }

    const handleLogout = async ()=>{
        setLoading(true)
        try{
            const data = await logout()
            setUser(null)
        }
        catch(err){

        }
        finally{
            setLoading(false)
        }
        
    }
    useEffect(()=>{
        const getAndSetUser = async()=>{
            try{
                const data = await getMe()
                setUser(data.user)
            }
            catch(err){ }finally{
                setLoading(false)
            }
        }
    },[])

    return {user,loading,handleRegister,handleLogin,handleLogout}
}